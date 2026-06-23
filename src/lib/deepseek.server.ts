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

export async function deepseekJson<T = unknown>(
  messages: DeepseekMessage[],
  opts: Omit<DeepseekOptions, "json"> = {},
): Promise<T> {
  const raw = await deepseekChat(messages, { ...opts, json: true });
  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract a JSON block from the response
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`DeepSeek returned non-JSON: ${raw.slice(0, 200)}`);
  }
}

// Internal exports for tests
export const __test__ = { isRetryableError, isRetryableStatus, DeepseekHttpError };
