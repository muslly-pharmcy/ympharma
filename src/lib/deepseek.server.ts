// Server-only DeepSeek client. Uses OpenAI-compatible REST API directly via fetch
// to avoid pulling the openai SDK as a dependency.
//
// F-01 (TITAN v5.1): hardened with explicit per-attempt timeout (25s) and
// bounded exponential-backoff retry (3 attempts) on transient failures
// (network/abort, HTTP 408/429/5xx). Non-retryable errors (4xx other than 429,
// malformed JSON envelope) fail fast.

const BASE_URL = "https://api.deepseek.com/v1";
const ATTEMPT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 500;

export type DeepseekMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export interface DeepseekOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
  /** Override defaults for tests. */
  maxAttempts?: number;
  timeoutMs?: number;
}

class DeepseekHttpError extends Error {
  constructor(public status: number, public body: string) {
    super(`DeepSeek HTTP ${status}: ${body.slice(0, 300)}`);
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof DeepseekHttpError) return isRetryableStatus(err.status);
  const e = err as { name?: string; code?: string; cause?: { code?: string } };
  if (e?.name === "AbortError") return true; // per-attempt timeout
  const code = e?.code ?? e?.cause?.code;
  // Common Node/undici transient network codes
  return (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "ENOTFOUND" ||
    code === "UND_ERR_SOCKET" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Call DeepSeek chat completions.
 * Reads DEEPSEEK_API_KEY inside the function to keep secrets out of module scope.
 */
export async function deepseekChat(
  messages: DeepseekMessage[],
  opts: DeepseekOptions = {},
): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY غير مضبوط");

  const body: Record<string, unknown> = {
    model: opts.model ?? "deepseek-chat",
    messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.max_tokens ?? 512,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const maxAttempts = Math.max(1, opts.maxAttempts ?? MAX_ATTEMPTS);
  const timeoutMs = Math.max(1_000, opts.timeoutMs ?? ATTEMPT_TIMEOUT_MS);
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new DeepseekHttpError(res.status, text);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return json.choices?.[0]?.message?.content ?? "";
    } catch (e) {
      lastErr = e;
      const retryable = isRetryableError(e);
      if (!retryable || attempt === maxAttempts) {
        // Surface a normalized error message
        if (e instanceof DeepseekHttpError) throw new Error(e.message);
        if ((e as { name?: string }).name === "AbortError") {
          throw new Error(`DeepSeek timeout بعد ${timeoutMs}ms (attempt ${attempt}/${maxAttempts})`);
        }
        throw e;
      }
      // Exponential backoff with full jitter
      const delay = Math.round(BASE_BACKOFF_MS * 2 ** (attempt - 1) * (0.5 + Math.random()));
      console.warn(
        `[deepseek] attempt ${attempt}/${maxAttempts} failed (${(e as Error).message}); retrying in ${delay}ms`,
      );
      await sleep(delay);
    } finally {
      clearTimeout(timer);
    }
  }
  // Defensive — loop above always throws or returns.
  throw (lastErr as Error) ?? new Error("DeepSeek failed without error");
}

// ---------------------------------------------------------------------------
// J-2: Strip markdown code fences (```json ... ``` or ``` ... ```)
// ---------------------------------------------------------------------------
export function stripMarkdownFences(text: string): string {
  let s = text.trim();
  // Opening fence with optional language tag
  s = s.replace(/^```(?:json|JSON|javascript|js)?\s*\r?\n?/, "");
  // Closing fence
  s = s.replace(/\r?\n?```\s*$/, "");
  return s.trim();
}

// ---------------------------------------------------------------------------
// J-1: Balanced-brace JSON extractor.
// Walks the string, tracks string literals (and escapes), and returns the
// first top-level balanced `{...}` or `[...]` span — replaces the greedy
// regex `/\{[\s\S]*\}/` which can over-capture when the model emits two
// JSON blocks or trailing prose.
// ---------------------------------------------------------------------------
export function extractBalancedJson(text: string): string | null {
  const len = text.length;
  for (let start = 0; start < len; start++) {
    const open = text[start];
    if (open !== "{" && open !== "[") continue;
    const close = open === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < len; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString) {
        if (ch === "\\") escape = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// J-3: Redact secret-shaped tokens before logging raw model output.
// Patterns covered: sk-/pk-/sb_/xoxb- API keys, JWTs, Bearer tokens,
// generic "token"/"secret"/"password"/"api_key" JSON values, and emails.
// ---------------------------------------------------------------------------
export function redactSensitiveData(text: string): string {
  if (!text) return text;
  return text
    // Bearer / Authorization headers
    .replace(/\b(Bearer|Basic)\s+[A-Za-z0-9._\-+/=]+/gi, "$1 [REDACTED]")
    // JWT-like (three base64url segments)
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "[REDACTED_JWT]")
    // sk-/pk-/sb_/xoxb-/ghp_ style keys
    .replace(/\b(sk|pk|rk|sb|xoxb|ghp|gho|ghs|glpat)[-_][A-Za-z0-9_-]{12,}\b/g, "[REDACTED_KEY]")
    // JSON-ish "token"/"secret"/"password"/"api_key" values
    .replace(
      /("(?:token|secret|password|api[_-]?key|authorization)"\s*:\s*")([^"]{4,})(")/gi,
      "$1[REDACTED]$3",
    )
    // Email addresses (best-effort PII scrub)
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]");
}

export async function deepseekJson<T = unknown>(
  messages: DeepseekMessage[],
  opts: Omit<DeepseekOptions, "json"> = {},
): Promise<T> {
  const raw = await deepseekChat(messages, { ...opts, json: true });

  // Attempt 1: direct parse (fast path — `response_format=json_object` guarantees this in ~99% of cases)
  try {
    return JSON.parse(raw) as T;
  } catch {
    // fall through
  }

  // Attempt 2 (J-2): strip markdown fences and retry
  const unfenced = stripMarkdownFences(raw);
  if (unfenced !== raw) {
    try {
      return JSON.parse(unfenced) as T;
    } catch {
      // fall through
    }
  }

  // Attempt 3 (J-1): balanced-brace extraction
  const block = extractBalancedJson(unfenced);
  if (block) {
    try {
      return JSON.parse(block) as T;
    } catch (e) {
      // J-3: structured log with redacted raw for forensic debugging
      console.error("[deepseek] JSON parse failed after extraction", {
        error: (e as Error).message,
        block_preview: redactSensitiveData(block.slice(0, 500)),
        raw_preview: redactSensitiveData(raw.slice(0, 500)),
        raw_length: raw.length,
      });
      throw new Error(`DeepSeek returned malformed JSON block: ${(e as Error).message}`);
    }
  }

  // J-3: final-failure structured log
  console.error("[deepseek] non-JSON response", {
    raw_preview: redactSensitiveData(raw.slice(0, 500)),
    raw_length: raw.length,
  });
  throw new Error(`DeepSeek returned non-JSON: ${redactSensitiveData(raw.slice(0, 200))}`);
}

// Internal exports for tests
export const __test__ = {
  isRetryableError,
  isRetryableStatus,
  DeepseekHttpError,
  stripMarkdownFences,
  extractBalancedJson,
  redactSensitiveData,
};
