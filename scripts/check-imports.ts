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
