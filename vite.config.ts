// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, nitro (build-only using cloudflare as a default target),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Server-only env vars (no VITE_ prefix) needed by server routes such as
// the auth email webhook (SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY).
// Do NOT add these keys to envDefine — that would leak secrets to the client.
const serverEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
Object.assign(process.env, serverEnv);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    ssr: false,
  },
  vite: {
    plugins: [
      ...(process.platform === "win32" ? [] : [mcpPlugin()]),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        filename: "sw.js",
        // Client assets are emitted to dist/client; the SW must live beside them.
        outDir: "dist/client",
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          // Public build artifacts only; never persist account HTML or API data.
          globPatterns: ["**/*.{js,css,woff2,png,svg,webp,ico}", "offline.html"],
          globIgnores: ["purge-legacy-private-caches.js"],
          navigateFallback: null,
          importScripts: ["/purge-legacy-private-caches.js"],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({ request, sameOrigin, url }: { request: Request; sameOrigin: boolean; url: URL }) =>
                sameOrigin && request.mode === "navigate" &&
                !/^\/(?:api(?:\/|$)|\.mcp(?:\/|$)|\.well-known(?:\/|$)|~oauth(?:\/|$))/.test(url.pathname),
              handler: "NetworkOnly",
              options: {
                fetchOptions: { cache: "no-store" },
                precacheFallback: { fallbackURL: "/offline.html" },
              },
            },
          ],
        },
      }),
    ],

    build: {
      // Hidden source maps: emitted to disk for Sentry/Lighthouse without
      // referencing them from shipped JS (no `//# sourceMappingURL`).
      sourcemap: 'hidden',
    },
    resolve: {
      // React Email imports the legacy `entities/lib/*.js` subpaths. The pinned
      // entities@4.5.0 ships those under `lib/esm/`, so point the aliases there
      // (v6+ `dist/esm/` paths do not exist in this install).
      alias: {
        "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/lib/esm/decode.js"),
        "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/lib/esm/encode.js"),
      },
    },
  },
});
