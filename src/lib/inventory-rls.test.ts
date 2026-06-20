// RLS integration tests — these only run when the DB env vars are present
// (managed psql access). In CI without DB they are skipped.
import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const ANON = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const has = Boolean(URL && ANON);

describe.skipIf(!has)("RLS — anon cannot reach audit tables", () => {
  const anon = has ? createClient(URL!, ANON!, { auth: { persistSession: false } }) : null;

  it("anon cannot SELECT inventory_manual_adjustments", async () => {
    const { data, error } = await anon!.from("inventory_manual_adjustments").select("id").limit(1);
    // Either empty (filtered by RLS) or error — both prove anon has no access.
    expect(error?.message ?? "").toMatch(/permission|denied|policy|RLS|not found|relation|JWT|invalid|expected/i);
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot INSERT into inventory_manual_adjustments", async () => {
    const { error } = await anon!.from("inventory_manual_adjustments")
      .insert({ product_id: "00000000-0000-0000-0000-000000000000", delta: 1, before_qty: 0, after_qty: 1 } as never);
    expect(error).toBeTruthy();
  });

  it("anon cannot SELECT trigger_metrics", async () => {
    const { data } = await anon!.from("trigger_metrics").select("id").limit(1);
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot SELECT supplier_link_audit", async () => {
    const { data } = await anon!.from("supplier_link_audit").select("id").limit(1);
    expect(data ?? []).toEqual([]);
  });

  it("anon CANNOT list prescription storage objects", async () => {
    const { data, error } = await anon!.storage.from("prescriptions").list("uploads", { limit: 10 });
    // List requires SELECT on the bucket itself; our policy is path-scoped via storage.foldername([1]).
    // We assert that listing returns empty OR error — never enumerating real files.
    expect(error || (data && data.length === 0)).toBeTruthy();
  });
});
