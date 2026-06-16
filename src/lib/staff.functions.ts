import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PERMS = ["orders", "prescriptions", "users", "products", "pricing", "integrations"] as const;
type Perm = (typeof PERMS)[number];

async function assertOwner(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ليست لديك صلاحية المالك");
}

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: roles, error: rolesError }, { data: perms, error: permsError }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("staff_permissions").select("permission").eq("user_id", userId),
    ]);
    if (rolesError) throw new Error(rolesError.message);
    if (permsError) throw new Error(permsError.message);
    const roleSet = new Set(((roles ?? []) as { role: string }[]).map((r) => r.role));
    return {
      isOwner: roleSet.has("owner"),
      isAdmin: roleSet.has("admin"),
      permissions: ((perms ?? []) as { permission: string }[]).map((p) => p.permission),
    };
  });

export const bootstrapOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("bootstrap_owner");
    if (error) throw new Error(error.message);
    return { promoted: Boolean(data) };
  });

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "owner"]);
    if (error) throw new Error(error.message);
    const userIds = Array.from(new Set((roles ?? []).map((r) => r.user_id as string)));
    if (userIds.length === 0) return [] as Array<{ userId: string; email: string; isOwner: boolean; permissions: string[] }>;

    const { data: perms } = await supabaseAdmin
      .from("staff_permissions")
      .select("user_id, permission")
      .in("user_id", userIds);

    const users = await Promise.all(
      userIds.map(async (id) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        return { id, email: data.user?.email ?? "—" };
      }),
    );

    return userIds.map((id) => {
      const user = users.find((u) => u.id === id)!;
      const rs = (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role as string);
      return {
        userId: id,
        email: user.email,
        isOwner: rs.includes("owner"),
        permissions: (perms ?? []).filter((p) => p.user_id === id).map((p) => p.permission as string),
      };
    });
  });

const inviteSchema = z.object({
  email: z.string().trim().email().max(255),
  permissions: z.array(z.enum(PERMS)).max(10),
});

export const inviteStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => inviteSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user by email via admin listUsers (paginate small)
    let target: { id: string; email: string } | null = null;
    let page = 1;
    while (page < 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (u) { target = { id: u.id, email: u.email ?? "" }; break; }
      if (list.users.length < 200) break;
      page++;
    }
    if (!target) throw new Error("لم يتم العثور على مستخدم بهذا البريد. اطلب منه إنشاء حساب أولاً.");

    // Grant admin role
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: target.id, role: "admin" },
      { onConflict: "user_id,role" },
    );

    // Replace permissions
    await supabaseAdmin.from("staff_permissions").delete().eq("user_id", target.id);
    if (data.permissions.length > 0) {
      await supabaseAdmin
        .from("staff_permissions")
        .insert(data.permissions.map((p) => ({ user_id: target!.id, permission: p })));
    }
    return { ok: true, userId: target.id };
  });

const updateSchema = z.object({
  userId: z.string().uuid(),
  permissions: z.array(z.enum(PERMS)).max(10),
});

export const updateStaffPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("staff_permissions").delete().eq("user_id", data.userId);
    if (data.permissions.length > 0) {
      await supabaseAdmin
        .from("staff_permissions")
        .insert(data.permissions.map((p) => ({ user_id: data.userId, permission: p })));
    }
    return { ok: true };
  });

export const removeStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOwner(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("لا يمكنك حذف نفسك");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Don't remove owner role via this endpoint
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId).eq("role", "admin");
    await supabaseAdmin.from("staff_permissions").delete().eq("user_id", data.userId);
    return { ok: true };
  });
