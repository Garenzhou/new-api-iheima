#!/usr/bin/env python3
"""Bulk-translate a frontend i18n locale from en.json via an OpenAI-compatible API.

Usage:
    python3 scripts/translate_locale.py <lang> [--dry-run]

Examples:
    python3 scripts/translate_locale.py ko
    python3 scripts/translate_locale.py ar --dry-run

Behavior:
    - Reads web/src/i18n/locales/en.json as the source of keys.
    - Translates every key that is missing from (or still English in)
      web/src/i18n/locales/<lang>.json.
    - Successful per-key translations are cached in
      web/scripts/.translate-<lang>-cache.json so retries skip them.
      Cache entries whose English source changed are re-translated.
      Failed keys are NOT cached and are retried on the next run; they fall
      back to English only in the final output of this run.
    - Batches BATCH_SIZE keys per request with CONCURRENCY concurrent workers.
    - Brand names listed in _brand-blocklist.mjs are reverted to the English
      source value after translation (brand protection).
    - Values whose {{placeholder}} set does not match the source are treated
      as failures (not cached) to protect interpolation contracts.

Env vars:
    OPENAI_API_KEY    (required)
    OPENAI_BASE_URL   (default: https://api.openai.com/v1)
    OPENAI_MODEL      (default: gpt-4o-mini)
    BATCH_SIZE        (default: 80)
    CONCURRENCY       (default: 3)

The script uses only the Python standard library.
"""

import json
import os
import re
import sys
import tempfile
import threading
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

WEB_ROOT = Path(__file__).resolve().parent.parent
LOCALES_DIR = WEB_ROOT / "src" / "i18n" / "locales"
BLOCKLIST_PATH = Path(__file__).resolve().parent / "_brand-blocklist.mjs"

BATCH_SIZE = int(os.environ.get("BATCH_SIZE", "80"))
CONCURRENCY = max(1, int(os.environ.get("CONCURRENCY", "3")))
API_KEY = os.environ.get("OPENAI_API_KEY", "")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
BASE_URL = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")

PLACEHOLDER_RE = re.compile(r"\{\{[^{}]*\}\}")
BRAND_ENTRY_RE = re.compile(r"'((?:[^'\\]|\\.)*)'")


def language_display_name(code: str) -> str:
    names = {
        "ar": "Arabic (Modern Standard Arabic)",
        "ko": "Korean (Hangul)",
        "fr": "French",
        "ja": "Japanese",
        "ru": "Russian",
        "vi": "Vietnamese",
        "zh": "Simplified Chinese",
        "zh-TW": "Traditional Chinese",
        "en": "English",
    }
    return names.get(code, code)


def load_brand_blocklist() -> set[str]:
    """Extract BRAND_AND_LITERAL_KEYS string literals from the .mjs source.

    Keeping the .mjs file as the single source of truth avoids drift between
    the Node and Python translation pipelines.
    """
    values: set[str] = set()
    if not BLOCKLIST_PATH.exists():
        return values
    inside = False
    for line in BLOCKLIST_PATH.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if "BRAND_AND_LITERAL_KEYS" in stripped and "=" in stripped:
            inside = True
            continue
        if not inside:
            continue
        for match in BRAND_ENTRY_RE.finditer(stripped):
            literal = match.group(1)
            # Undo simple JS escapes produced by our regex capture.
            literal = literal.replace("\\'", "'").replace("\\\\", "\\")
            values.add(literal)
        if stripped.startswith("]"):
            break
    return values


def placeholders(value: str) -> list[str]:
    return sorted(PLACEHOLDER_RE.findall(str(value)))


def read_translation(path: Path) -> dict:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    trans = data.get("translation")
    return trans if isinstance(trans, dict) else {}


def write_json_atomic(path: Path, data) -> None:
    fd, tmp_name = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(data, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(tmp_name, path)
    except BaseException:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)
        raise


class TranslationCache:
    """Per-key success cache: {key: {"en": source, "t": translated}}.

    Also reads legacy entries written by the earlier Node pipeline, which
    stored the translation under the "ar" field instead of "t".
    """

    def __init__(self, path: Path):
        self.path = path
        self.lock = threading.Lock()
        self.data: dict = {}
        if path.exists():
            try:
                self.data = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                self.data = {}

    @staticmethod
    def entry_matches(entry, source: str) -> bool:
        if not isinstance(entry, dict):
            return False
        translated = entry.get("t") or entry.get("ar")
        return entry.get("en") == source and isinstance(translated, str) and bool(translated.strip())

    def get(self, key: str, source: str) -> str | None:
        entry = self.data.get(key)
        if self.entry_matches(entry, source):
            return entry.get("t") or entry.get("ar")
        return None

    def put(self, key: str, source: str, translated: str) -> None:
        with self.lock:
            self.data[key] = {"en": source, "t": translated}

    def persist(self) -> None:
        with self.lock:
            snapshot = json.dumps(self.data, ensure_ascii=False, indent=2)
        tmp_fd, tmp_name = tempfile.mkstemp(dir=str(self.path.parent), suffix=".tmp")
        try:
            with os.fdopen(tmp_fd, "w", encoding="utf-8") as handle:
                handle.write(snapshot)
                handle.write("\n")
            os.replace(tmp_name, self.path)
        except BaseException:
            if os.path.exists(tmp_name):
                os.unlink(tmp_name)
            raise


def translate_batch(batch: dict, target_language: str, brand_keys: set[str]) -> tuple[dict, list]:
    """Translate one batch. Returns ({key: translation}, [failed keys])."""
    protected = ", ".join(sorted(brand_keys))
    system = (
        "You are a professional UI translator for a developer/admin dashboard. "
        f"Translate the user-supplied JSON object of English UI strings into {target_language}. "
        "Preserve any {{var}}-style placeholders literally (do not translate the "
        "variable name; only translate the surrounding prose). "
        f"Preserve these brand names and literal strings exactly "
        f"(do not translate them): {protected}. "
        "URLs, code-like strings, technical identifiers, and pure-punctuation "
        "values should be left unchanged. "
        "Return only a JSON object whose keys exactly match the input keys, "
        "with no comments, code fences, or extra text. "
        "Empty input values should remain empty in the output."
    )
    payload = {
        "model": MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": json.dumps(batch, ensure_ascii=False)},
        ],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    request = urllib.request.Request(
        f"{BASE_URL}/chat/completions",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {API_KEY}",
            "User-Agent": "translate-locale/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=180) as response:
            body = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
        print(f"[warn] batch request failed: {exc}", file=sys.stderr)
        return {}, list(batch)

    choices = body.get("choices") or []
    content = (choices[0].get("message") or {}).get("content") if choices else None
    if not isinstance(content, str) or not content.strip():
        print("[warn] empty assistant message", file=sys.stderr)
        return {}, list(batch)

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        print(f"[warn] invalid JSON in response: {content[:120]!r}", file=sys.stderr)
        return {}, list(batch)

    ok: dict = {}
    failed: list = []
    for key, source in batch.items():
        value = parsed.get(key)
        if (
            not isinstance(value, str)
            or not value.strip()
            or placeholders(value) != placeholders(source)
        ):
            failed.append(key)
            continue
        # Brand protection: blocklisted sources stay English verbatim.
        ok[key] = source if source in brand_keys else value
    return ok, failed


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    dry_run = "--dry-run" in sys.argv[1:]
    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    lang = args[0]

    en_path = LOCALES_DIR / "en.json"
    out_path = LOCALES_DIR / f"{lang}.json"
    cache_path = WEB_ROOT / "scripts" / f".translate-{lang}-cache.json"
    cache = TranslationCache(cache_path)

    en_trans = read_translation(en_path)
    current = read_translation(out_path)
    brand_keys = load_brand_blocklist()

    todo: dict = {}
    resolved: dict = {}
    for key, source in en_trans.items():
        existing = current.get(key)
        if isinstance(existing, str) and existing != source:
            continue
        cached = cache.get(key, source)
        if cached is not None:
            resolved[key] = cached
            continue
        todo[key] = source

    total = len(en_trans)
    print(
        f"[info] {lang}: {total} source keys, {len(resolved)} from cache, "
        f"{total - len(todo) - len(resolved)} already translated, "
        f"{len(todo)} to translate",
        file=sys.stderr,
    )
    if not todo:
        return 0

    items = list(todo.items())
    batches = [
        dict(items[start : start + BATCH_SIZE])
        for start in range(0, len(items), BATCH_SIZE)
    ]
    print(
        f"[info] running {len(batches)} batches of <= {BATCH_SIZE} keys "
        f"with {CONCURRENCY} workers",
        file=sys.stderr,
    )
    if dry_run:
        return 0

    lock = threading.Lock()
    done_count = 0
    fallback_count = 0

    def worker(batch_index: int) -> None:
        nonlocal done_count, fallback_count
        batch = batches[batch_index]
        ok, failed = translate_batch(batch, language_display_name(lang), brand_keys)
        for key in failed or []:
            ok.pop(key, None)
        for key, value in ok.items():
            cache.put(key, batch[key], value)
            resolved[key] = value
        with lock:
            done_count += 1
            fallback_count += len(failed)
            cache.persist()
            print(
                f"[info] batch {done_count}/{len(batches)}: "
                f"{len(ok)} translated, {len(failed)} failed",
                file=sys.stderr,
            )

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
        list(executor.map(worker, range(len(batches))))

    merged = {}
    for key, source in en_trans.items():
        existing = current.get(key)
        merged[key] = (
            existing
            if isinstance(existing, str) and existing != source
            else resolved.get(key, source)
        )
    merged = dict(sorted(merged.items()))
    write_json_atomic(out_path, {"translation": merged})
    print(
        f"[info] wrote {out_path}: {len(resolved)} translated this run, "
        f"{fallback_count} failed (retry by re-running), "
        f"cache size {len(cache.data)}",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
