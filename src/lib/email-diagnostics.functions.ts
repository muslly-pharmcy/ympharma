import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertOwner(ctx: any) {
  const { data } = await ctx.supabase.from("user_roles").select("role")
    .eq("user_id", ctx.userId).in("role", ["owner", "admin"]).maybeSingle();
  if (!data) throw new Error("Forbidden");
}

/**
 * Smoke-test: import the registry and try rendering every template with its previewData.
 * Surfaces missing-module / export-mismatch / runtime render errors clearly.
 */
export const renderTemplatesSmokeTest = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);

    const startedAt = Date.now();
    const results: Array<{
      name: string;
      ok: boolean;
      htmlBytes?: number;
      error?: string;
      errorKind?: "missing_module" | "export_mismatch" | "render_error" | "unknown";
    }> = [];

    let React: typeof import("react");
    let render: (el: any) => Promise<string>;
    let TEMPLATES: Record<string, any>;
    try {
      React = await import("react");
      const reactEmail = await import("@react-email/components");
      // v1 API: `render` is async and returns a string. `renderAsync` was removed.
      render = (reactEmail as any).render;
      if (typeof render !== "function") {
        return {
          ok: false,
          durationMs: Date.now() - startedAt,
          fatal: "export_mismatch: @react-email/components does not export `render`. Upgrade to v1+ and use `render` (not `renderAsync`).",
          results,
        };
      }
      const reg = await import("@/lib/email-templates/registry");
      TEMPLATES = reg.TEMPLATES;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      const kind = msg.includes("Cannot find module") ? "missing_module" : msg.includes("does not provide an export") ? "export_mismatch" : "unknown";
      return { ok: false, durationMs: Date.now() - startedAt, fatal: `${kind}: ${msg}`, results };
    }

    for (const [name, entry] of Object.entries(TEMPLATES)) {
      try {
        const data = entry.previewData ?? {};
        const html = await render(React.createElement(entry.component, data));
        results.push({ name, ok: true, htmlBytes: html.length });
      } catch (e: any) {
        const msg = String(e?.message ?? e);
        const errorKind = msg.includes("Cannot find module") ? "missing_module"
          : msg.includes("does not provide an export") ? "export_mismatch"
          : "render_error";
        results.push({ name, ok: false, error: msg, errorKind });
      }
    }

    return {
      ok: results.every(r => r.ok),
      durationMs: Date.now() - startedAt,
      results,
    };
  });

/** Last 20 sends with full error context, no dedup so we can see every attempt. */
export const listEmailDiagnostics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);
    const { createClient } = await import("@supabase/supabase-js");
    const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin
      .from("email_send_log")
      .select("id,message_id,template_name,recipient_email,status,error_message,created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);

    const classify = (msg: string | null) => {
      if (!msg) return null;
      if (msg.includes("Cannot find module")) return "missing_module";
      if (msg.includes("does not provide an export")) return "export_mismatch";
      if (msg.toLowerCase().includes("suppress")) return "suppressed";
      if (msg.toLowerCase().includes("timeout")) return "timeout";
      return "other";
    };

    return {
      rows: (data ?? []).map(r => ({
        ...r,
        errorKind: classify(r.error_message),
      })),
    };
  });
