## Problem

Build fails at vite config load:
```
ERR_PACKAGE_PATH_NOT_EXPORTED: Package subpath './decode' is not defined by "exports" in /dev-server/node_modules/entities/package.json
imported from .../cheerio/node_modules/htmlparser2/dist/esm/Parser.js
```

`package.json` forces a global `overrides: { entities: "4.5.0" }`. That was added so `react-email`'s older `htmlparser2` (which imports `entities/lib/decode.js`) keeps working. But cheerio's `htmlparser2@10` (loaded at Vite config time via Tailwind's @tailwindcss/node loader) needs `entities/decode` — a subpath that exists only in v6+. v4.5.0 doesn't export it, and Vite aliases don't apply during Node's own config-load resolution, so the build dies before Vite even starts.

There is no single version of `entities` that exports both `./decode` (v6+) and `./lib/decode.js` (v4.x).

## Fix

Pin the override to v6 (satisfies cheerio/htmlparser2@10 natively) and let Vite rewrite the legacy `entities/lib/...` paths to v6's `dist/esm/...` for the SSR bundle that includes react-email.

### 1) `package.json`

Bump both override blocks from `4.5.0` to `6.0.1`:

```json
"overrides": {
  "entities": "6.0.1"
},
"resolutions": {
  "entities": "6.0.1"
}
```

### 2) `vite.config.ts`

Repoint the two existing aliases from v4's `lib/` paths to v6's `dist/esm/` paths so anything still importing the legacy subpath (react-email's bundled htmlparser2) resolves cleanly during SSR bundling:

```ts
alias: {
  "entities/lib/decode.js": path.resolve(__dirname, "node_modules/entities/dist/esm/decode.js"),
  "entities/lib/encode.js": path.resolve(__dirname, "node_modules/entities/dist/esm/encode.js"),
}
```

No `entities/decode` alias is needed — v6 exports it natively.

### 3) Reinstall + verify

- `bun install` to refresh the lockfile with `entities@6.0.1`.
- Run `build:dev` and confirm vite config now loads.
- Smoke-test the auth email preview route (`/lovable/email/auth/preview`) to confirm react-email still renders with v6 entities — the public APIs we use (`decodeHTML`, `fromCodePoint`, `escapeUTF8`) are unchanged across v4→v6.

## Out of scope (deferred from your message)

The rest of the v14.0 message proposes new files (`ParticleBackground` perf rewrite, Vitest setup, `__tests__/unit/*`, `vitest.config.ts`, `package.json` scripts, `DashboardCard`/`PrescriptionList` references) and assumes components that don't exist in this repo (`@/components/dashboard/DashboardCard`, `PrescriptionList`, etc.). I'm intentionally leaving those out of this plan — the build is broken and that's the blocker. Once the build is green, tell me which subset (perf-only? tests-only?) you actually want and I'll adapt it to the real component paths.
