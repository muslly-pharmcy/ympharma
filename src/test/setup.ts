import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { server } from "./mocks/server";

// jsdom doesn't implement these — virtualizer & image cache use them.
if (typeof window !== "undefined") {
  (window as any).requestIdleCallback = (cb: any) => setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);
  (window as any).cancelIdleCallback = (id: any) => clearTimeout(id);
  (window.URL as any).createObjectURL = vi.fn(() => "blob:mock");
  (window.URL as any).revokeObjectURL = vi.fn();
}

// Anchor click → jsdom no-op; CSV export relies on it.
HTMLAnchorElement.prototype.click = function () { /* noop in tests */ };

// Mock fetch for image cache so prefetch never throws.
if (!globalThis.fetch || (globalThis.fetch as any).__mocked !== true) {
  const f = vi.fn(async () => new Response(new Blob(["x"], { type: "image/jpeg" }), { status: 200 }));
  (f as any).__mocked = true;
  globalThis.fetch = f as any;
}

// MSW lifecycle. `onUnhandledRequest: "bypass"` keeps legacy tests working —
// only requests with explicit handlers are intercepted.
beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
