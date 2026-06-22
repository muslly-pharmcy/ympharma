// Loyalty — user-scoped read fns + admin-only mutations.
// Mutations call SECURITY DEFINER PG functions via supabaseAdmin (REVOKEd from anon/authenticated).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LoyaltyAccount = {
  id: string;
  phone_number: string;
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  total_spent_yer: number;
  created_at: string;
  updated_at: string;
};

export type LoyaltyTransaction = {
  id: string;
  phone_number: string;
  points: number;
  type: "earned" | "redeemed" | "bonus" | "expired" | "adjustment";
  description: string | null;
  order_id: string | null;
  created_at: string;
};

export const getMyLoyalty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("loyalty_accounts")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { account: (data ?? null) as LoyaltyAccount | null };
  });

export const getMyLoyaltyTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).optional() }).partial().parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    // RLS scopes via loyalty_accounts.user_id mapping
    const { data: rows, error } = await context.supabase
      .from("loyalty_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    if (error) throw new Error(error.message);
    return { transactions: (rows ?? []) as LoyaltyTransaction[] };
  });

async function assertAdmin(supabase: import("@supabase/supabase-js").SupabaseClient, userId: string) {
  const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "admin" } as never),
    supabase.rpc("has_role" as never, { _user_id: userId, _role: "owner" } as never),
  ]);
  if (!isAdmin && !isOwner) throw new Error("forbidden");
}

export const adminAddLoyaltyPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        phone: z.string().min(5),
        spentYer: z.number().positive(),
        orderId: z.string().uuid().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: pts, error } = await supabaseAdmin.rpc("add_loyalty_points" as never, {
      _phone: data.phone,
      _spent_yer: data.spentYer,
      _order_id: data.orderId ?? null,
    } as never);
    if (error) throw new Error(error.message);
    return { pointsAdded: (pts as number) ?? 0 };
  });

export const adminRedeemLoyaltyPoints = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ phone: z.string().min(5), points: z.number().int().positive() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as never, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: discount, error } = await supabaseAdmin.rpc(
      "redeem_loyalty_points" as never,
      { _phone: data.phone, _points: data.points } as never,
    );
    if (error) throw new Error(error.message);
    return { discountYer: Number(discount ?? 0) };
  });

/** Normalize Yemeni phone to digits-only, keep last 9 digits (e.g. 7XXXXXXXX). */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  // strip 967 prefix or leading 00
  const trimmed = digits.replace(/^(00)?967/, "");
  return trimmed.replace(/^0+/, "");
}

/**
 * User-initiated: link a phone number to the current account.
 * Upserts customer_profiles and sets loyalty_accounts.user_id when the phone
 * matches an unlinked loyalty row (or creates a fresh empty account).
 */
export const linkLoyaltyAccountByPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ phone: z.string().min(5).max(20) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const phone = normalizePhone(data.phone);
    if (phone.length < 7) throw new Error("invalid_phone");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) Upsert customer_profiles (phone is the PK)
    await supabaseAdmin
      .from("customer_profiles")
      .upsert({ phone } as never, { onConflict: "phone" });

    // 2) Look up loyalty_accounts by phone
    const { data: existing } = await supabaseAdmin
      .from("loyalty_accounts")
      .select("id, user_id, phone_number")
      .eq("phone_number", phone)
      .maybeSingle();

    if (existing) {
      const row = existing as { id: string; user_id: string | null; phone_number: string };
      if (row.user_id && row.user_id !== context.userId) {
        throw new Error("phone_already_linked_to_other_user");
      }
      if (!row.user_id) {
        const { error: linkErr } = await supabaseAdmin
          .from("loyalty_accounts")
          .update({ user_id: context.userId } as never)
          .eq("id", row.id);
        if (linkErr) throw new Error(linkErr.message);
      }
      return { linked: true, phone, created: false };
    }

    // 3) Create empty account already tied to user
    const { error: insErr } = await supabaseAdmin
      .from("loyalty_accounts")
      .insert({
        phone_number: phone,
        user_id: context.userId,
        points: 0,
        tier: "bronze",
        total_spent_yer: 0,
      } as never);
    if (insErr) throw new Error(insErr.message);
    return { linked: true, phone, created: true };
  });
