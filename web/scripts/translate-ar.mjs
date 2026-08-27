#!/usr/bin/env node
// Bulk-translate frontend i18n keys (web/src/i18n/locales/en.json) into Arabic.
//
// This script reads the 5317 English keys from en.json, calls the OpenAI
// Chat Completions API in batches to produce ar.json, then runs
// `bun run i18n:sync` to reorder/normalize the new file in en.json's
// key order. On any API failure (network, auth, rate limit, JSON parse
// error, missing keys, or empty/invalid values), the affected batch
// falls back to the English source. The build never blocks on a flaky
// API.
//
// Per `.agents/skills/i18n-translate/SKILL.md`, locale writes normally
// flow through a temp `add-missing-keys.mjs` + `bun run i18n:sync`. For
// the *initial* population of a brand-new locale file (where there is
// no existing ar.json to keep in sync with), we write ar.json directly
// and rely on `bun run i18n:sync` to enforce base-order sorting, the
// `BRAND_AND_LITERAL_KEYS` brand-protection pass, and the missing-keys
// report. Re-running the script is idempotent: already-translated keys
// are skipped.
//
// Env vars:
//   OPENAI_API_KEY   (required for translation; absent = English-fallback for all batches)
//   OPENAI_MODEL     (default: gpt-4o-mini)
//   OPENAI_BASE_URL  (default: https://api.openai.com/v1)
//   BATCH_SIZE       (default: 200)
//   CONCURRENCY      (default: 1; number of in-flight translation requests;
//                     raise this to overlap model latency, but stay below
//                     the provider's per-account rate limit)
//   DRY_RUN          (default: false; if true, parse inputs and report counts
//                     but do not call the API, write the JSON, or run i18n:sync)
//   SKIP_SYNC        (default: false; if true, do not invoke `bun run i18n:sync`
//                     after writing ar.json. Useful for CI smoke tests.)
//   CACHE_FILE       (default: web/scripts/.translate-ar-cache.json; a
//                     per-key success cache that lets interrupted or retried
//                     runs pick up where they left off without re-calling the
//                     model for already-translated keys)

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BRAND_AND_LITERAL_KEYS } from './_brand-blocklist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// This script lives at <repo>/web/scripts/translate-ar.mjs. The web
// package root is at <repo>/web/.
const WEB_ROOT = path.resolve(__dirname, '..')
const REPO_ROOT = path.resolve(WEB_ROOT, '..')
const EN_JSON = path.join(WEB_ROOT, 'src/i18n/locales/en.json')
const AR_JSON = path.join(WEB_ROOT, 'src/i18n/locales/ar.json')
const CACHE_FILE = process.env.CACHE_FILE
  ? path.resolve(process.env.CACHE_FILE)
  : path.join(__dirname, '.translate-ar-cache.json')

const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 200)
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 1)
const API_KEY = process.env.OPENAI_API_KEY ?? ''
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const BASE_URL = (
  process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
).replace(/\/+$/, '')
const DRY_RUN = process.env.DRY_RUN === 'true'
const SKIP_SYNC = process.env.SKIP_SYNC === 'true'

// ---- Translation -------------------------------------------------------

async function translateBatch(batch) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY not set')
  const brandList = [...BRAND_AND_LITERAL_KEYS].join(', ')
  const system =
    'You are a professional UI translator for a developer/admin dashboard. ' +
    'Translate the user-supplied JSON object of English UI strings into Modern ' +
    'Standard Arabic (MSA). ' +
    'Preserve any {{var}}-style placeholders literally (do not translate the ' +
    'variable name; only translate the surrounding prose). ' +
    `Preserve these brand names and literal strings exactly (do not translate them): ${brandList}. ` +
    'URLs, code-like strings, technical identifiers, and pure-punctuation ' +
    'values should be left unchanged. ' +
    'Return only a JSON object whose keys exactly match the input keys, ' +
    'with no comments, code fences, or extra text. ' +
    'Empty input values should remain empty in the output.'
  const user = JSON.stringify(Object.fromEntries(batch))
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      `API ${res.status} ${res.statusText}: ${body.slice(0, 200)}`
    )
  }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content) {
    throw new Error('Empty assistant message')
  }
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(
      `Invalid JSON in assistant response: ${content.slice(0, 200)}`
    )
  }
  // Per-key validation: collect the keys the model produced correctly and
  // report the rest as missing. We deliberately do NOT throw on a single
  // missing key — that would force a 100% English fallback for the whole
  // batch, throwing away the 99 keys that did translate. The caller
  // decides how to handle the missing list (cache the successes and
  // fall back per-key for the failures).
  const ok = new Map()
  const missing = []
  for (const [k] of batch) {
    const v = parsed[k]
    if (typeof v !== 'string' || !v.trim()) {
      missing.push(k)
      continue
    }
    ok.set(k, v)
  }
  return { ok, missing }
}

function enforceBrands(en, ar) {
  const reverted = []
  for (const [k, enVal] of en) {
    if (!BRAND_AND_LITERAL_KEYS.has(enVal)) continue
    if (ar.get(k) !== enVal) {
      ar.set(k, enVal)
      reverted.push(k)
    }
  }
  return reverted
}

// ---- Main --------------------------------------------------------------

async function readEnJson() {
  const text = await readFile(EN_JSON, 'utf8')
  const parsed = JSON.parse(text)
  if (!parsed.translation || typeof parsed.translation !== 'object') {
    throw new Error('en.json is missing the top-level "translation" object')
  }
  return Object.entries(parsed.translation)
}

async function readArJson() {
  try {
    const text = await readFile(AR_JSON, 'utf8')
    const parsed = JSON.parse(text)
    if (parsed.translation && typeof parsed.translation === 'object') {
      return new Map(Object.entries(parsed.translation))
    }
  } catch {
    // ar.json may not exist yet.
  }
  return new Map()
}

// Per-key success cache. Persists to disk so an interrupted or retried
// run picks up where the previous one left off without re-calling the
// model. The cache stores the English source alongside the translation
// so a stale cache (where the source text has changed) is detected and
// re-translated on the next run.
async function readCache() {
  try {
    const text = await readFile(CACHE_FILE, 'utf8')
    const parsed = JSON.parse(text)
    if (parsed && typeof parsed === 'object')
      return new Map(Object.entries(parsed))
  } catch {
    // No cache yet.
  }
  return new Map()
}

async function writeCache(cache) {
  await writeFile(
    CACHE_FILE,
    `${JSON.stringify(Object.fromEntries(cache), null, 2)}\n`,
    'utf8'
  )
}

async function runI18nSync() {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', ['run', 'i18n:sync'], {
      cwd: WEB_ROOT,
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`bun run i18n:sync exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function main() {
  const enEntries = await readEnJson()
  process.stderr.write(`[info] en.json has ${enEntries.length} keys\n`)

  const arExisting = await readArJson()
  const cache = await readCache()
  const translated = new Map()
  const todo = []
  for (const [k, enVal] of enEntries) {
    // 1. Skip if ar.json already has a non-English value.
    if (arExisting.has(k) && arExisting.get(k) !== enVal) continue
    // 2. Skip if the on-disk cache has a translation matching the
    //    current English source (re-translate if the source changed).
    const cached = cache.get(k)
    if (
      cached &&
      typeof cached === 'object' &&
      cached.en === enVal &&
      cached.ar
    ) {
      translated.set(k, cached.ar)
      continue
    }
    todo.push([k, enVal])
  }
  const skipFromAr = enEntries.length - todo.length - translated.size
  process.stderr.write(
    `[info] ${todo.length} keys to translate, ${translated.size} from cache, ${skipFromAr} already in ar.json\n`
  )
  if (todo.length === 0) {
    process.stderr.write('[info] nothing to do\n')
    return
  }
  if (DRY_RUN) {
    process.stderr.write(
      `[info] DRY_RUN=true; would translate ${todo.length} keys in ${Math.ceil(todo.length / BATCH_SIZE)} batches\n`
    )
    return
  }

  let fallbackKeys = 0
  const totalBatches = Math.ceil(todo.length / BATCH_SIZE)
  const workerCount = Math.max(1, Math.min(CONCURRENCY, totalBatches))
  const batchRanges = []
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    batchRanges.push({
      start: i,
      end: Math.min(i + BATCH_SIZE, todo.length),
      idx: batchRanges.length + 1,
    })
  }
  process.stderr.write(
    `[info] running ${totalBatches} batches with ${workerCount} concurrent workers\n`
  )
  let nextBatchIdx = 0
  let completedBatches = 0
  // The cache is shared across workers; serialize writes with this lock
  // to avoid interleaved temp-file renames.
  let cacheWriteChain = Promise.resolve()
  async function persistCache() {
    cacheWriteChain = cacheWriteChain.then(() => writeCache(cache))
    return cacheWriteChain
  }
  async function worker() {
    while (true) {
      const claim = nextBatchIdx++
      if (claim >= batchRanges.length) return
      const { start, end, idx } = batchRanges[claim]
      const batch = todo.slice(start, end)
      process.stderr.write(
        `[info] batch ${idx}/${totalBatches} (${batch.length} keys)... `
      )
      try {
        const { ok, missing } = await translateBatch(batch)
        for (const [k, v] of ok) {
          translated.set(k, v)
          // Find the enVal for this key so the cache can detect stale entries.
          const enVal = batch.find(([bk]) => bk === k)?.[1] ?? ''
          cache.set(k, { en: enVal, ar: v })
        }
        if (missing.length > 0) {
          // Per-key fallback: only the missing keys go to English, the
          // successful ones are still cached and reused next run.
          for (const k of missing) {
            const enVal = batch.find(([bk]) => bk === k)?.[1] ?? ''
            translated.set(k, enVal)
            fallbackKeys += 1
          }
          await persistCache()
          process.stderr.write(
            `ok (${ok.size} translated, ${missing.length} fallback: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '...' : ''})\n`
          )
        } else {
          await persistCache()
          process.stderr.write('ok\n')
        }
      } catch (e) {
        // Whole-batch failure (network, auth, parse error, empty
        // response). Fall back the entire batch to English and DO NOT
        // cache anything; the next run will retry.
        process.stderr.write(`fallback to English: ${e.message}\n`)
        for (const [k, v] of batch) {
          translated.set(k, v)
          fallbackKeys += 1
        }
      }
      completedBatches += 1
    }
  }
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  void completedBatches // silence unused; reported via per-batch log above

  // Brand-name reversion pass.
  const enMap = new Map(enEntries)
  const reverted = enforceBrands(enMap, translated)
  for (const k of reverted) {
    process.stderr.write(`[warn] brand-name reversion applied: ${k}\n`)
  }

  // Merge and write ar.json. We use the en.json key order so that
  // `bun run i18n:sync` has minimal reordering to do.
  const merged = new Map(arExisting)
  for (const [k, v] of translated) merged.set(k, v)

  const out = { translation: {} }
  for (const [k] of enEntries) {
    if (merged.has(k)) out.translation[k] = merged.get(k)
  }
  // Any ar-only keys (shouldn't happen on first run) get appended at the
  // end; the sync script will move them to _extras/ on the next pass.
  for (const [k, v] of merged) {
    if (!(k in out.translation)) out.translation[k] = v
  }

  await writeFile(AR_JSON, `${JSON.stringify(out, null, 2)}\n`, 'utf8')

  const totalTranslated = translated.size - reverted.length
  process.stderr.write(
    `[info] wrote ${path.relative(REPO_ROOT, AR_JSON)}: ${totalTranslated} translated, ${fallbackKeys} fallback, ${reverted.length} brand-reverted, cache size ${cache.size}\n`
  )

  if (SKIP_SYNC) {
    process.stderr.write('[info] SKIP_SYNC=true; not running i18n:sync\n')
    return
  }
  process.stderr.write('[info] running bun run i18n:sync to normalize...\n')
  await runI18nSync()
}

main().catch((e) => {
  process.stderr.write(`[fatal] ${e?.stack ?? e}\n`)
  process.exit(1)
})
