// Phoenix Invoice Intelligence — per-line review + commit
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { updateLineSchema, commitSchema } from "../domain/schemas";

export const updateInvoiceLine = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateLineSchema.parse(i))
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.patch.user_confirmed_product_id !== undefined)
      patch.user_confirmed_product_id = data.patch.user_confirmed_product_id;
    if (data.patch.user_confirmed_qty !== undefined)
      patch.user_confirmed_qty = data.patch.user_confirmed_qty;
    if (data.patch.user_confirmed_cost !== undefined)
      patch.user_confirmed_cost = data.patch.user_confirmed_cost;
    if (data.patch.user_confirmed_expiry !== undefined)
      patch.user_confirmed_expiry = data.patch.user_confirmed_expiry;
    if (data.patch.status !== undefined) patch.status = data.patch.status;

    const { data: row, error } = await context.supabase
      .from("invoice_line_items")
      .update(patch as never)
      .eq("id", data.line_id)
      .select("id, extraction_id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "update_failed");

    // Fetch upload_id for audit
    const { data: ext } = await context.supabase
      .from("invoice_extractions")
      .select("upload_id")
      .eq("id", (row as { extraction_id: string }).extraction_id)
      .single();
    if (ext) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("invoice_audit_events").insert({
        upload_id: (ext as { upload_id: string }).upload_id,
        actor_user_id: context.userId,
        event_type: "line_reviewed",
        payload: { line_id: data.line_id, patch },
      } as never);
    }
    return { ok: true };
  });

export const commitInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => commitSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: upload, error: uErr } = await supabase
      .from("invoice_uploads")
      .select("id, organization_id, supplier_id, status")
      .eq("id", data.upload_id)
      .single();
    if (uErr || !upload) throw new Error("upload_not_found");
    if ((upload as { status: string }).status === "committed")
      throw new Error("already_committed");

    const { data: ext } = await supabase
      .from("invoice_extractions")
      .select("id")
      .eq("upload_id", data.upload_id)
      .single();
    if (!ext) throw new Error("no_extraction");

    const { data: lines, error: lErr } = await supabase
      .from("invoice_line_items")
      .select("*")
      .eq("extraction_id", (ext as { id: string }).id);
    if (lErr) throw new Error(lErr.message);

    const list = (lines ?? []) as Array<{
      id: string;
      status: string;
      user_confirmed_product_id: string | null;
      matched_product_id: string | null;
      user_confirmed_qty: number | null;
      quantity: number | null;
      user_confirmed_cost: number | null;
      unit_cost: number | null;
      user_confirmed_expiry: string | null;
      expiry_date: string | null;
      batch_number: string | null;
    }>;

    const pending = list.filter((l) => l.status === "pending");
    if (pending.length > 0) throw new Error(`review_incomplete: ${pending.length} lines still pending`);

    const confirmed = list.filter((l) => l.status === "confirmed");
    const commitResults: Array<{ line_id: string; batch_id: string }> = [];

    for (const ln of confirmed) {
      const productId = ln.user_confirmed_product_id ?? ln.matched_product_id;
      const qty = ln.user_confirmed_qty ?? ln.quantity;
      if (!productId || !qty || qty <= 0) {
        throw new Error(`line ${ln.id}: missing product or qty`);
      }
      const cost = ln.user_confirmed_cost ?? ln.unit_cost ?? null;
      const expiry = ln.user_confirmed_expiry ?? ln.expiry_date ?? null;

      const { data: batchId, error: rpcErr } = await supabase.rpc(
        "inv_receive_stock" as never,
        {
          _org: (upload as { organization_id: string }).organization_id,
          _warehouse: data.warehouse_id,
          _product: productId,
          _qty: qty,
          _batch_no: ln.batch_number,
          _expiry: expiry,
          _cost: cost,
          _supplier: (upload as { supplier_id: string | null }).supplier_id,
          _reason: `invoice:${data.upload_id}`,
        } as never,
      );
      if (rpcErr) throw new Error(`line ${ln.id}: ${rpcErr.message}`);
      commitResults.push({ line_id: ln.id, batch_id: batchId as string });
    }

    await supabase
      .from("invoice_uploads")
      .update({ status: "committed" } as never)
      .eq("id", data.upload_id);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("invoice_audit_events").insert({
      upload_id: data.upload_id,
      actor_user_id: userId,
      event_type: "committed",
      payload: {
        warehouse_id: data.warehouse_id,
        committed_lines: commitResults.length,
        skipped_lines: list.filter((l) => l.status === "skipped").length,
        batches: commitResults,
      },
    } as never);

    return { committed: commitResults.length, batches: commitResults };
  });
