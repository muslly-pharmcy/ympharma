import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Owner-only: set a new password for a target user by email, and confirm their email.
export const adminSetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      email: z.string().trim().email(),
      newPassword: z.string().min(12).max(72),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "owner",
    });
    if (!isOwner) throw new Error("Forbidden: owner only");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Find user
    let target: { id: string } | null = null;
    let page = 1;
    while (page < 20) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const u = list.users.find((x) => (x.email ?? "").toLowerCase() === data.email.toLowerCase());
      if (u) { target = { id: u.id }; break; }
      if (list.users.length < 200) break;
      page++;
    }
    if (!target) throw new Error("User not found");

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(target.id, {
      password: data.newPassword,
      email_confirm: true,
    });
    if (updErr) throw new Error(updErr.message);

    return { ok: true, userId: target.id };
  });
