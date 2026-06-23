// J-1 / J-2 / J-3 hardening tests for src/lib/deepseek.server.ts
import { describe, it, expect } from "vitest";
import { __test__ } from "@/lib/deepseek.server";

const { stripMarkdownFences, extractBalancedJson, redactSensitiveData } = __test__;

describe("J-2: stripMarkdownFences", () => {
  it("strips ```json ... ``` fences", () => {
    const input = '```json\n{"a":1}\n```';
    expect(stripMarkdownFences(input)).toBe('{"a":1}');
  });
  it("strips bare ``` ... ``` fences", () => {
    expect(stripMarkdownFences("```\n[1,2]\n```")).toBe("[1,2]");
  });
  it("leaves non-fenced text untouched", () => {
    expect(stripMarkdownFences('{"a":1}')).toBe('{"a":1}');
  });
});

describe("J-1: extractBalancedJson", () => {
  it("returns the first balanced object", () => {
    expect(extractBalancedJson('prose {"a":1} tail')).toBe('{"a":1}');
  });
  it("returns the first balanced array", () => {
    expect(extractBalancedJson("xx [1,2,[3]] yy")).toBe("[1,2,[3]]");
  });
  it("does NOT over-capture across two top-level objects (defeats greedy regex)", () => {
    // greedy /\{[\s\S]*\}/ would return `{"a":1} junk {"b":2}` — invalid JSON.
    expect(extractBalancedJson('{"a":1} junk {"b":2}')).toBe('{"a":1}');
  });
  it("ignores braces inside strings", () => {
    expect(extractBalancedJson('{"s":"a{b}c","n":1}')).toBe('{"s":"a{b}c","n":1}');
  });
  it("handles escaped quotes inside strings", () => {
    expect(extractBalancedJson('{"q":"he said \\"hi\\"","n":2}')).toBe(
      '{"q":"he said \\"hi\\"","n":2}',
    );
  });
  it("returns null when unbalanced", () => {
    expect(extractBalancedJson('{"a":1')).toBeNull();
  });
});

describe("J-3: redactSensitiveData", () => {
  it("redacts Bearer tokens", () => {
    expect(redactSensitiveData("Authorization: Bearer abc.def.ghi")).toContain("Bearer [REDACTED]");
  });
  it("redacts JWTs", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdef1234567890";
    expect(redactSensitiveData(`token=${jwt}`)).toContain("[REDACTED_JWT]");
  });
  it("redacts sk-/sb_ style API keys", () => {
    expect(redactSensitiveData("key=sk-abcdef1234567890")).toContain("[REDACTED_KEY]");
    expect(redactSensitiveData("k=sb_secret_abcdef1234567890")).toContain("[REDACTED_KEY]");
  });
  it("redacts JSON token/secret/password values", () => {
    const out = redactSensitiveData('{"token":"abcd1234","password":"hunter22"}');
    expect(out).not.toContain("abcd1234");
    expect(out).not.toContain("hunter22");
    expect(out).toContain("[REDACTED]");
  });
  it("redacts emails", () => {
    expect(redactSensitiveData("contact user@example.com")).toContain("[REDACTED_EMAIL]");
  });
  it("is a no-op on clean text", () => {
    expect(redactSensitiveData('{"a":1,"b":"hello"}')).toBe('{"a":1,"b":"hello"}');
  });
});
