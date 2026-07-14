#!/usr/bin/env bun
/**
 * SEC-P1-004 — CI Import-Graph Guard
 *
 * Fails the build if any client-reachable source file has a TOP-LEVEL
 * static import of a server-only module (`*.server.ts(x)` or
 * `@/integrations/supabase/client.server`).
 *
 * Dynamic imports inside function bodies (`await import('...')`) are allowed —
 * that is the SEC-P1-002 remediation pattern.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, dirname } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC = join(ROOT, "src");

// Files that are themselves server-only — allowed to import other server modules.
const SERVER_FILE_RE = /\.server\.(ts|tsx)$/;

// Forbidden import specifiers (resolved or alias).
function isForbidden(spec: string): boolean {
  if (/\.server(\.tsx?)?$/.test(spec)) return true;
  if (spec === "@/integrations/supabase/client.server") return true;
  if (spec.endsWith("/client.server")) return true;
  return false;
}

// Strip /* */ and // comments so we don't false-positive on commented imports.
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

// Match top-level static imports only (anchored to line start, optional whitespace).
// import ... from "x";  |  import "x";  |  export ... from "x";
const STATIC_IMPORT_RE =
  /^[ \t]*(?:import|export)\b[^'"`\n;]*?\bfrom\s*['"]([^'"]+)['"]/gm;
const BARE_IMPORT_RE = /^[ \t]*import\s*['"]([^'"]+)['"]/gm;

type Violation = { file: string; spec: string; line: number };

function scan(file: string): Violation[] {
  const raw = readFileSync(file, "utf8");
  const src = stripComments(raw);
  const out: Violation[] = [];
  const push = (spec: string, idx: number) => {
    if (!isForbidden(spec)) return;
    const line = src.slice(0, idx).split("\n").length;
    out.push({ file: relative(ROOT, file), spec, line });
  };
  for (const m of src.matchAll(STATIC_IMPORT_RE)) push(m[1], m.index ?? 0);
  for (const m of src.matchAll(BARE_IMPORT_RE)) push(m[1], m.index ?? 0);
  return out;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p);
  }
  return acc;
}

const SKIP_DIR = ["__tests__", "test", "tests"];
// Paths that execute server-side only (server routes, server middleware).
// Their top-level imports never ship to the browser, so *.server imports are allowed.
const SERVER_ONLY_PREFIXES = [
  "routes/api/",      // TanStack server routes
  "middleware/",      // server-fn middleware
];
function isClientReachable(file: string): boolean {
  if (SERVER_FILE_RE.test(file)) return false;
  const rel = relative(SRC, file).replace(/\\/g, "/");
  if (SKIP_DIR.some((d) => rel.split("/").includes(d))) return false;
  if (/\.(test|spec)\.(ts|tsx)$/.test(file)) return false;
  if (SERVER_ONLY_PREFIXES.some((p) => rel.startsWith(p))) return false;
  return true;
}

const files = walk(SRC).filter(isClientReachable);
const violations: Violation[] = [];
for (const f of files) violations.push(...scan(f));

if (violations.length) {
  console.error("\n❌ SEC-P1-004 import-graph guard FAILED");
  console.error(`   ${violations.length} forbidden top-level server import(s):\n`);
  for (const v of violations) {
    console.error(`   ${v.file}:${v.line}  imports  ${v.spec}`);
  }
  console.error(
    "\n   Fix: move the import inside a server-fn `.handler()` body using `await import(...)`,",
  );
  console.error(
    "        or move the server-only logic out of the client-reachable module.\n",
  );
  process.exit(1);
}

console.log(`✅ SEC-P1-004: scanned ${files.length} client-reachable files — 0 violations.`);

// ============================================================
// PHOENIX-P2 — Layer boundary guard
// ============================================================
// R1: src/core/**     may NOT import from src/modules/** or src/platform/**
// R2: src/platform/** may NOT import from src/modules/**
// R3: src/modules/<A>/** may NOT import from src/modules/<B>/internal
//     (allowed: `@/modules/<B>` or `@/modules/<B>/index`)

type LayerViolation = { file: string; spec: string; line: number; rule: string };

const ALL_FILES = walk(SRC);
const layerViolations: LayerViolation[] = [];

function normalizeSpec(spec: string): string | null {
  if (spec.startsWith("@/")) return spec.slice(2);
  return null;
}
function layerOf(rel: string): "core" | "platform" | "modules" | "other" {
  if (rel.startsWith("core/")) return "core";
  if (rel.startsWith("platform/")) return "platform";
  if (rel.startsWith("modules/")) return "modules";
  return "other";
}
function moduleNameOf(rel: string): string | null {
  const m = /^modules\/([^/]+)/.exec(rel);
  return m ? m[1] : null;
}

for (const f of ALL_FILES) {
  const rel = relative(SRC, f).replace(/\\/g, "/");
  const fileLayer = layerOf(rel);
  if (fileLayer === "other") continue;
  const src = stripComments(readFileSync(f, "utf8"));

  const pushMatches = (re: RegExp) => {
    for (const m of src.matchAll(re)) {
      const spec = m[1];
      const norm = normalizeSpec(spec);
      if (!norm) continue;
      const targetLayer = layerOf(norm);
      const line = src.slice(0, m.index ?? 0).split("\n").length;
      const relFile = relative(ROOT, f);

      if (fileLayer === "core" && (targetLayer === "modules" || targetLayer === "platform")) {
        layerViolations.push({ file: relFile, spec, line, rule: "R1 core → " + targetLayer });
        continue;
      }
      if (fileLayer === "platform" && targetLayer === "modules") {
        layerViolations.push({ file: relFile, spec, line, rule: "R2 platform → modules" });
        continue;
      }
      if (fileLayer === "modules" && targetLayer === "modules") {
        const from = moduleNameOf(rel);
        const to = moduleNameOf(norm);
        if (from && to && from !== to) {
          const allowed = norm === `modules/${to}` || norm === `modules/${to}/index`;
          if (!allowed) {
            layerViolations.push({
              file: relFile,
              spec,
              line,
              rule: `R3 modules/${from} → modules/${to} internal`,
            });
          }
        }
      }
    }
  };
  pushMatches(STATIC_IMPORT_RE);
  pushMatches(BARE_IMPORT_RE);
}

if (layerViolations.length) {
  console.error("\n❌ PHOENIX-P2 layer boundary guard FAILED");
  console.error(`   ${layerViolations.length} forbidden cross-layer import(s):\n`);
  for (const v of layerViolations) {
    console.error(`   [${v.rule}]  ${v.file}:${v.line}  imports  ${v.spec}`);
  }
  console.error(
    "\n   Fix: cross-module reads go through the target module's public index,",
  );
  console.error(
    "        or communicate via @/core/events (emit / registerHandler).\n",
  );
  process.exit(1);
}

console.log(`✅ PHOENIX-P2: scanned ${ALL_FILES.length} files — 0 layer violations.`);
