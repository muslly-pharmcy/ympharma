// Phase 7 — RLS guard for prescription_extractions & prescription_reviews
// Skipped automatically when DB env vars are not present.
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const has = Boolean(URL && ANON);

describe.skipIf(!has)("RLS — anon cannot access AI prescription tables", () => {
  const anon = has ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null;

  it("anon cannot SELECT prescription_extractions", async () => {
    const { data, error } = await anon!.from("prescription_extractions").select("id").limit(1);
    expect(error || (data ?? []).length === 0).toBeTruthy();
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot INSERT prescription_extractions", async () => {
    const { error } = await anon!.from("prescription_extractions").insert({
      prescription_file_id: "00000000-0000-0000-0000-000000000000",
      prescription_id: "rx_anon_attempt",
      source_type: "prescription",
    } as never);
    expect(error).toBeTruthy();
  });

  it("anon cannot UPDATE prescription_extractions", async () => {
    const { error, data } = await anon!.from("prescription_extractions")
      .update({ status: "done" } as never)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    expect(error || (data ?? []).length === 0).toBeTruthy();
  });

  it("anon cannot SELECT prescription_reviews", async () => {
    const { data, error } = await anon!.from("prescription_reviews").select("id").limit(1);
    expect(error || (data ?? []).length === 0).toBeTruthy();
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot UPDATE prescription_reviews", async () => {
    const { error, data } = await anon!.from("prescription_reviews")
      .update({ status: "APPROVED" } as never)
      .neq("id", "00000000-0000-0000-0000-000000000000")
      .select("id");
    expect(error || (data ?? []).length === 0).toBeTruthy();
  });
});
