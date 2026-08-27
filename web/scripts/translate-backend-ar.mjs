#!/usr/bin/env node
// Bulk-translate backend i18n keys (i18n/keys.go) into Arabic.
//
// This script reads the 234 Msg* constants from i18n/keys.go and the
// corresponding English values from i18n/locales/en.yaml, then calls the
// OpenAI Chat Completions API in batches to produce i18n/locales/ar.yaml.
//
// On any API failure (network, auth, rate limit, JSON parse error, missing
// keys, or empty/invalid values), the affected batch falls back to the
// English source. The build never blocks on a flaky API.
//
// Env vars:
//   OPENAI_API_KEY   (required for translation; absent = English-fallback for all batches)
//   OPENAI_MODEL     (default: gpt-4o-mini)
//   OPENAI_BASE_URL  (default: https://api.openai.com/v1)
//   BATCH_SIZE       (default: 50; smaller than the frontend's 200 because Go
//                     values can include Go template placeholders like
//                     {{.Max}} that need careful preservation)
//   DRY_RUN          (default: false; if true, parse inputs and report counts
//                     but do not call the API or write the YAML)

import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BRAND_AND_LITERAL_KEYS } from './_brand-blocklist.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// This script lives at <repo>/web/scripts/translate-backend-ar.mjs. The Go
// i18n tree is at <repo>/i18n/.
const REPO_ROOT = path.resolve(__dirname, '..', '..')
const EN_YAML = path.join(REPO_ROOT, 'i18n', 'locales', 'en.yaml')
const AR_YAML = path.join(REPO_ROOT, 'i18n', 'locales', 'ar.yaml')
const KEYS_GO = path.join(REPO_ROOT, 'i18n', 'keys.go')

const BATCH_SIZE = Number(process.env.BATCH_SIZE ?? 50)
const API_KEY = process.env.OPENAI_API_KEY ?? ''
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const BASE_URL = (
  process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'
).replace(/\/+$/, '')
const DRY_RUN = process.env.DRY_RUN === 'true'

// ---- Parsing helpers ----------------------------------------------------

/**
 * Parse a flat YAML map (only the en.yaml / ar.yaml shape used by this
 * project: `key.path: "value"` per line, no nesting, with `# ...` comment
 * lines and blank lines). Returns Map<string, string>.
 *
 * The YAML files use unquoted strings, single-quoted, and double-quoted
 * forms. We accept the double-quoted form, which is what all current
 * files use. Escape sequences `\\`, `\"`, `\n`, `\t` are decoded.
 */
function decodeYamlEscape(match) {
  if (match === '\\n') return '\n'
  if (match === '\\t') return '\t'
  return match.slice(-1)
}

const YAML_ESCAPE_RE = /\\./g

function parseFlatYaml(text) {
  const out = new Map()
  for (const line of text.split('\n')) {
    const m = /^([a-zA-Z0-9._-]+):\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(line)
    if (!m) continue
    out.set(m[1], m[2].replaceAll(YAML_ESCAPE_RE, decodeYamlEscape))
  }
  return out
}

/**
 * Extract `Msg* = "key.path"` declarations from i18n/keys.go. The Go
 * source has multi-line `const ( ... )` blocks; we match any line
 * starting with optional whitespace + Msg + identifier + `=` + quoted
 * string.
 */
function parseKeysGo(text) {
  const keys = []
  const re = /^\s*Msg[A-Za-z0-9_]+\s*=\s*"([^"]+)"\s*$/
  for (const line of text.split('\n')) {
    const m = re.exec(line)
    if (m) keys.push(m[1])
  }
  return keys
}

// ---- Translation -------------------------------------------------------

/**
 * Ask the model to translate a batch of {key, english} pairs into Arabic.
 * Returns an object { key: arabicValue, ... }.
 *
 * Throws on any failure; caller is expected to fall back to English.
 */
async function translateBatch(batch) {
  if (!API_KEY) throw new Error('OPENAI_API_KEY not set')
  const brandList = [...BRAND_AND_LITERAL_KEYS].join(', ')
  const system =
    'You are a professional UI translator for a developer/admin dashboard. ' +
    'Translate the user-supplied JSON object of English UI strings into Modern ' +
    'Standard Arabic (MSA). ' +
    'Preserve any {{.Name}}-style Go template placeholders literally ' +
    '(do not translate the variable name; only translate the surrounding prose). ' +
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
  for (const [k] of batch) {
    if (!(k in parsed)) throw new Error(`Missing key in response: ${k}`)
    const v = parsed[k]
    if (typeof v !== 'string' || !v.trim()) {
      throw new Error(`Empty/invalid value for: ${k}`)
    }
  }
  return parsed
}

/**
 * Enforce brand preservation as a post-translation safety net: if the
 * English value is in the brand blocklist (or otherwise looks like a
 * literal identifier), the Arabic value must match the English value
 * byte-for-byte. If it does not, replace it with the English value and
 * log a warning.
 */
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

async function main() {
  const enText = await readFile(EN_YAML, 'utf8')
  const en = parseFlatYaml(enText)
  const keysText = await readFile(KEYS_GO, 'utf8')
  const keys = parseKeysGo(keysText)

  // Sanity: warn about any key in keys.go that's not in en.yaml.
  for (const k of keys) {
    if (!en.has(k)) {
      process.stderr.write(`[warn] key in keys.go not in en.yaml: ${k}\n`)
    }
  }

  // Idempotency: read existing ar.yaml and skip already-translated keys
  // (i.e. ar value present and not equal to en value).
  let ar = new Map()
  try {
    const arText = await readFile(AR_YAML, 'utf8')
    ar = parseFlatYaml(arText)
  } catch {
    // ar.yaml may not exist yet; that's fine.
  }

  const todo = []
  for (const k of keys) {
    if (!en.has(k)) continue
    const enVal = en.get(k)
    if (ar.has(k) && ar.get(k) !== enVal) continue // already translated
    todo.push([k, enVal])
  }
  const skipCount = keys.length - todo.length
  process.stderr.write(
    `[info] ${todo.length} keys to translate, ${skipCount} already translated, ${keys.length} total\n`
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

  // Batch translate.
  const translated = new Map()
  let fallbackBatches = 0
  let fallbackKeys = 0
  for (let i = 0; i < todo.length; i += BATCH_SIZE) {
    const batch = todo.slice(i, i + BATCH_SIZE)
    const batchIdx = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(todo.length / BATCH_SIZE)
    process.stderr.write(
      `[info] batch ${batchIdx}/${totalBatches} (${batch.length} keys)... `
    )
    try {
      const result = await translateBatch(batch)
      for (const [k, v] of Object.entries(result)) translated.set(k, v)
      process.stderr.write('ok\n')
    } catch (e) {
      process.stderr.write(`fallback to English: ${e.message}\n`)
      fallbackBatches += 1
      fallbackKeys += batch.length
      for (const [k, v] of batch) translated.set(k, v)
    }
  }

  // Brand-name reversion pass.
  const reverted = enforceBrands(en, translated)
  for (const k of reverted) {
    process.stderr.write(`[warn] brand-name reversion applied: ${k}\n`)
  }

  // Merge and write ar.yaml. We preserve the keys.go order so the file
  // matches the order of constants. We do NOT preserve the en.yaml
  // section comments because the input keys can be split across many
  // sections and we don't want to invent ordering.
  const merged = new Map(ar)
  for (const [k, v] of translated) merged.set(k, v)

  const lines = []
  lines.push('# Arabic translations (generated by translate-backend-ar.mjs)')
  lines.push('')
  for (const k of keys) {
    if (!merged.has(k)) continue
    const v = merged.get(k).replaceAll('\\', '\\\\').replaceAll('"', '\\"')
    lines.push(`${k}: "${v}"`)
  }
  await writeFile(AR_YAML, `${lines.join('\n')}\n`, 'utf8')

  const totalTranslated = translated.size - reverted.length
  process.stderr.write(
    `[info] wrote ${AR_YAML}: ${totalTranslated} translated, ${fallbackKeys} fallback, ${reverted.length} brand-reverted, ${fallbackBatches} failed batches\n`
  )
}

main().catch((e) => {
  process.stderr.write(`[fatal] ${e?.stack ?? e}\n`)
  process.exit(1)
})
