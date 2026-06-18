import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
  if (!isAdmin && !isOwner) throw new Error("Forbidden");
}

export const listImgProxyLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("img_proxy_logs")
      .select("id, created_at, host, url, status, ok, error, duration_ms")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    const total = data?.length ?? 0;
    const failures = data?.filter((r: any) => !r.ok).length ?? 0;
    return { rows: data ?? [], total, failures };
  });

export const getImgProxySettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("img_proxy_settings")
      .select("image_domain, allowed_hosts, updated_at, updated_by")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? { image_domain: "muslly.com", allowed_hosts: [], updated_at: null, updated_by: null };
  });

const hostRe = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
const domainRe = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

const settingsSchema = z.object({
  image_domain: z.string().min(3).max(253).regex(domainRe, "نطاق غير صالح"),
  allowed_hosts: z
    .array(z.string().min(3).max(253).regex(hostRe, "اسم مضيف غير صالح"))
    .min(1, "يجب تحديد مضيف واحد على الأقل")
    .max(50),
});

export const updateImgProxySettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // dedupe + lowercase hosts
    const cleanedHosts = Array.from(
      new Set(data.allowed_hosts.map((h) => h.trim().toLowerCase())),
    );
    const { error } = await context.supabase
      .from("img_proxy_settings")
      .update({
        image_domain: data.image_domain.trim().toLowerCase(),
        allowed_hosts: cleanedHosts,
        updated_at: new Date().toISOString(),
        updated_by: context.userId,
      })
      .eq("id", 1);
    if (error) throw new Error(error.message);
    return { ok: true, allowed_hosts: cleanedHosts };
  });
