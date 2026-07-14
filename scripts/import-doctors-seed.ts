#!/usr/bin/env bun
/**
 * PHOENIX P6.5-A — Doctor seed importer (Wave 1)
 *
 * NOT executed automatically. Manual run only, service-role key required.
 *
 *   bun run scripts/import-doctors-seed.ts --file healthcare/seed/aden-doctors-wave1.csv
 *   bun run scripts/import-doctors-seed.ts --file healthcare/seed/aden-doctors-wave1.csv --commit
 *
 * Default is dry-run: parses, validates, prints a plan, exits with non-zero on any invalid row.
 */
import { readFileSync } from "node:fs";
import { seedRowSchema, type SeedRow } from "../healthcare/seed/schema";

const args = process.argv.slice(2);
const fileArg = args[args.indexOf("--file") + 1];
const commit = args.includes("--commit");

if (!fileArg) {
  console.error("usage: import-doctors-seed.ts --file <path.csv> [--commit]");
  process.exit(2);
}

function parseCsv(text: string): SeedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = lines[0].split(",").map((h) => h.trim());
  const out: SeedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = (cells[idx] ?? "").trim(); });
    out.push(seedRowSchema.parse(row));
  }
  return out;
}

async function main() {
  const rows = parseCsv(readFileSync(fileArg, "utf8"));
  console.log(`Parsed ${rows.length} rows from ${fileArg}`);
  console.log(`Categories: ${[...new Set(rows.map((r) => r.specialty))].join(", ")}`);
  console.log(`Cities:     ${[...new Set(rows.map((r) => r.city))].join(", ")}`);

  if (!commit) {
    console.log("\nDRY-RUN — pass --commit to insert. No DB writes performed.");
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for --commit");
    process.exit(3);
  }
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(url, key, { auth: { persistSession: false } });

  let ok = 0, fail = 0;
  for (const r of rows) {
    const slug = r.full_name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase().slice(0, 100);
    const { error } = await admin.from("hc_doctors").insert({
      slug,
      full_name_ar: r.full_name,
      years_experience: r.experience ?? null,
      verification_status: r.verification_status,
      is_public: true,
      metadata: { source_tier: r.source, confidence_level: r.confidence_level ?? null, seed_wave: 1 },
    });
    if (error) { fail++; console.error(`FAIL ${r.full_name}: ${error.message}`); }
    else ok++;
  }
  console.log(`\nInserted ${ok} rows, ${fail} failures.`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
