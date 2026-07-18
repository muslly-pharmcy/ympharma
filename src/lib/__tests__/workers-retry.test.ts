import { describe, expect, it } from "vitest";
import { computeBackoff, isFatalError, DEFAULT_RETRY } from "@/lib/workers/retry-config";
import { runWithRetry } from "@/lib/workers/base-worker";
import { runWithConcurrency, batch, timeBox } from "@/lib/workers/optimization";

describe("retry-config", () => {
  it("computeBackoff caps at capMs", () => {
    const noJitter = { ...DEFAULT_RETRY, jitter: false };
    expect(computeBackoff(100, noJitter)).toBe(noJitter.capMs);
  });

  it("computeBackoff grows exponentially without jitter", () => {
    const p = { ...DEFAULT_RETRY, jitter: false };
    expect(computeBackoff(1, p)).toBe(p.baseMs);
    expect(computeBackoff(2, p)).toBe(p.baseMs * 2);
    expect(computeBackoff(3, p)).toBe(p.baseMs * 4);
  });

  it("isFatalError matches code strings", () => {
    expect(isFatalError({ code: "UNAUTHORIZED" })).toBe(true);
    expect(isFatalError({ code: "TRANSIENT" })).toBe(false);
    expect(isFatalError(new Error("oops"))).toBe(false);
  });
});

describe("runWithRetry", () => {
  it("succeeds on first try", async () => {
    const r = await runWithRetry(async () => 42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
    expect(r.attempts).toBe(1);
  });

  it("retries transient failures", async () => {
    let n = 0;
    const r = await runWithRetry(
      async () => {
        n++;
        if (n < 3) throw new Error("transient");
        return "ok";
      },
      { ...DEFAULT_RETRY, baseMs: 1, jitter: false },
    );
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(3);
  });

  it("stops on fatal error", async () => {
    let n = 0;
    const r = await runWithRetry(
      async () => {
        n++;
        const err = new Error("nope") as Error & { code: string };
        err.code = "UNAUTHORIZED";
        throw err;
      },
      { ...DEFAULT_RETRY, baseMs: 1, jitter: false },
    );
    expect(r.ok).toBe(false);
    expect(n).toBe(1);
  });
});

describe("optimization helpers", () => {
  it("runWithConcurrency preserves order", async () => {
    const out = await runWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => n * 2);
    expect(out).toEqual([2, 4, 6, 8, 10]);
  });

  it("batch splits arrays", () => {
    expect(batch([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("timeBox rejects when slow", async () => {
    await expect(timeBox(new Promise((r) => setTimeout(r, 50)), 10, "t")).rejects.toThrow(/exceeded/);
  });
});
