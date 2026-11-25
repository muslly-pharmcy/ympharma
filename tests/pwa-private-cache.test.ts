import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

describe("offline privacy policy", () => {
  const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");
  it("does not cache navigations or authenticated API responses", () => {
    expect(config).toContain('handler: "NetworkOnly"');
    expect(config).toContain('fetchOptions: { cache: "no-store" }');
    expect(config).toContain('navigateFallback: null');
    expect(config).toContain('precacheFallback: { fallbackURL: "/offline.html" }');
    expect(config).not.toMatch(/handler:\s*"(NetworkFirst|StaleWhileRevalidate|CacheFirst)"/);
    expect(config).toContain('importScripts: ["/purge-legacy-private-caches.js"]');
  });
  it("deletes only the old named caches during worker activation", async () => {
    const script = readFileSync(new URL("../public/purge-legacy-private-caches.js", import.meta.url), "utf8");
    const remove = vi.fn(async (_name: string) => true);
    let pending: Promise<unknown> | undefined;
    runInNewContext(script, {
      caches: { delete: remove },
      self: { addEventListener: (name: string, activate: (e: {waitUntil: (p: Promise<unknown>) => void}) => void) => {
        expect(name).toBe("activate");
        activate({ waitUntil: (p) => { pending = p; } });
      }},
    });
    expect(pending).toBeDefined();
    await pending;
    expect(remove.mock.calls.map((call) => call[0])).toEqual(["html-navigations", "api-cache", "static-assets"]);
  });
});
