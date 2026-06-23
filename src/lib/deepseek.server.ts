// Server-only DeepSeek client. Uses OpenAI-compatible REST API directly via fetch
// to avoid pulling the openai SDK as a dependency.

const BASE_URL = "https://api.deepseek.com/v1";

export type DeepseekMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string };

export interface DeepseekOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  json?: boolean;
}

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

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content ?? "";
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
