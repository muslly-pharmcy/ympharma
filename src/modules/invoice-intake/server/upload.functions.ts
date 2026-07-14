// Phoenix Invoice Intelligence — upload lifecycle server fns
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createUploadSchema, getSchema, cancelSchema } from "../domain/schemas";

/**
 * Creates an invoice_uploads row and returns a short-lived signed upload URL.
 * The client PUTs the image bytes to the returned URL; then calls extractInvoice.
 */
export const createInvoiceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => createUploadSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Insert row first (RLS enforces org write permission)
    const path = `${data.organization_id}/${crypto.randomUUID()}.${data.file_ext}`;
    const { data: row, error } = await supabase
      .from("invoice_uploads")
      .insert({
        organization_id: data.organization_id,
        branch_id: data.branch_id ?? null,
        supplier_id: data.supplier_id ?? null,
        uploaded_by: userId,
        storage_path: path,
        mime_type: data.mime_type,
        source: data.source,
        status: "uploaded",
      } as never)
      .select("id, storage_path")
      .single();
    if (error || !row) throw new Error(error?.message ?? "insert_failed");

    const { data: signed, error: signErr } = await supabase.storage
      .from("invoice-uploads")
      .createSignedUploadUrl(path);
    if (signErr || !signed) throw new Error(signErr?.message ?? "sign_failed");

    // Audit
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("invoice_audit_events").insert({
      upload_id: row.id,
      actor_user_id: userId,
      event_type: "uploaded",
      payload: { path, mime: data.mime_type, source: data.source },
    } as never);

    return {
      upload_id: row.id as string,
      storage_path: path,
      signed_url: signed.signedUrl,
      token: signed.token,
    };
  });

export const listMyInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    (i as { organization_id?: string })?.organization_id
      ? (i as { organization_id: string })
      : { organization_id: "" },
  )
  .handler(async ({ data, context }) => {
    const q = context.supabase
      .from("invoice_uploads")
      .select("id, status, source, created_at, storage_path, organization_id, supplier_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.organization_id) q.eq("organization_id", data.organization_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const cancelInvoiceUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => cancelSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("invoice_uploads")
      .update({ status: "cancelled" } as never)
      .eq("id", data.upload_id);
    if (error) throw new Error(error.message);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("invoice_audit_events").insert({
      upload_id: data.upload_id,
      actor_user_id: context.userId,
      event_type: "cancelled",
      payload: {},
    } as never);
    return { ok: true };
  });

export const getInvoiceForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => getSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: upload, error: uErr } = await context.supabase
      .from("invoice_uploads")
      .select("*")
      .eq("id", data.upload_id)
      .maybeSingle();
    if (uErr) throw new Error(uErr.message);
    if (!upload) throw new Error("not_found");

    const { data: extraction } = await context.supabase
      .from("invoice_extractions")
      .select("*")
      .eq("upload_id", data.upload_id)
      .maybeSingle();

    let lines: Array<Record<string, string | number | boolean | null>> = [];
    if (extraction) {
      const { data: rows } = await context.supabase
        .from("invoice_line_items")
        .select("*")
        .eq("extraction_id", (extraction as { id: string }).id)
        .order("line_no");
      lines = (rows ?? []) as Array<Record<string, string | number | boolean | null>>;
    }

    // Signed image URL (10 min)
    const { data: signed } = await context.supabase.storage
      .from("invoice-uploads")
      .createSignedUrl((upload as { storage_path: string }).storage_path, 600);

    return {
      upload: JSON.parse(JSON.stringify(upload)) as Record<string, string | number | boolean | null>,
      extraction: extraction ? (JSON.parse(JSON.stringify(extraction)) as Record<string, string | number | boolean | null>) : null,
      lines,
      image_url: signed?.signedUrl ?? null,
    };
  });
