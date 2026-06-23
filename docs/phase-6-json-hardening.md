# Phase 6-J — JSON Parser Hardening (J-1 / J-2 / J-3)

**File:** `src/lib/deepseek.server.ts`
**Status:** ✅ Implemented & tested (15/15 passing)

## Pipeline (deepseekJson)

The parser now runs a 3-stage cascade. The first stage that yields valid JSON wins:

| Stage | Technique | Defends against |
|---|---|---|
| 1 | `JSON.parse(raw)` (fast path) | Normal case — `response_format=json_object` makes this succeed ~99% of the time. |
| 2 | `stripMarkdownFences` + parse | Model wraps output in ` ```json ... ``` ` despite the schema hint. |
| 3 | `extractBalancedJson` + parse | Model emits prose before/after, or two top-level blocks. Walks the string with a brace counter that respects string literals and escape sequences — replaces the greedy `/\{[\s\S]*\}/` regex which would over-capture across two blocks. |

If all three stages fail, a **structured error log** is emitted and the function throws.

## Redaction (J-3)

`redactSensitiveData(text)` is applied to **every** raw payload before it touches `console.error`. Covered patterns:

- `Bearer <token>` / `Basic <token>` → `Bearer [REDACTED]`
- JWTs (3 base64url segments starting with `eyJ`) → `[REDACTED_JWT]`
- `sk-` / `pk-` / `sb_` / `xoxb-` / `ghp_` / `glpat-` keys → `[REDACTED_KEY]`
- JSON values for `token`/`secret`/`password`/`api_key`/`authorization` → `[REDACTED]`
- Email addresses → `[REDACTED_EMAIL]`

## Structured log shape

```ts
console.error("[deepseek] JSON parse failed after extraction", {
  error: string,            // exception message
  block_preview: string,    // first 500 chars of extracted block, REDACTED
  raw_preview: string,      // first 500 chars of original raw, REDACTED
  raw_length: number,       // total length for triage
});
```

This format is grep-friendly (`[deepseek]`) and safe to ship to any log aggregator without leaking secrets.

## Test coverage

`src/__tests__/unit/deepseek-json-hardening.test.ts` — 15 tests:
- J-2: 3 tests (json fence, bare fence, no fence)
- J-1: 6 tests (object, array, two top-level blocks, braces-in-strings, escaped quotes, unbalanced)
- J-3: 6 tests (Bearer, JWT, sk-/sb_, JSON values, emails, no-op clean)

## Ops note

A parse failure is now a **diagnosable event**, not a black box. Search logs for `[deepseek] non-JSON response` or `[deepseek] JSON parse failed` to retrieve the redacted payload preview and length.
