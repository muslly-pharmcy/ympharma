import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const fetchExecDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("exec_dashboard");
    if (error) throw new Error(error.message);
    return data;
  });

export const listMarketingQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "sent", "skipped", "failed"]).optional(),
        limit: z.number().int().min(1).max(500).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc("marketing_queue_list", {
      _status: data.status ?? undefined,
      _limit: data.limit ?? 200,
    });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const approveQueueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("marketing_queue_approve", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const skipQueueItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("marketing_queue_skip", { _id: data.id });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markQueueSent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        wamid: z.string().optional(),
        error: z.string().optional(),
      })
      .parse(i),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("marketing_queue_mark_sent", {
      _id: data.id,
      _wamid: data.wamid ?? undefined,
      _error: data.error ?? undefined,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAgentRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ limit: z.number().int().min(1).max(500).optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    const { data: rows, error } = await context.supabase.rpc("agent_runs_list", { _limit: data.limit ?? 100 });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const runIntelNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Only owner/admin may trigger a manual rebuild.
    const { data: isOwner } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "owner" });
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isOwner && !isAdmin) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("rebuild_customer_intel");
    if (error) throw new Error(error.message);
    return data;
  });
