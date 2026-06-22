// Phase 3 — Admin-only server function wrapping prescription-intelligence.server.
// Verifies the caller is admin/owner before invoking AI vision.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const analyzePrescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ imageUrl: z.string().url() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const [{ data: isAdmin }, { data: isOwner }] = await Promise.all([
      context.supabase.rpc("has_role" as never, {
        _user_id: context.userId,
        _role: "admin",
      } as never),
      context.supabase.rpc("has_role" as never, {
        _user_id: context.userId,
        _role: "owner",
      } as never),
    ]);
    if (!isAdmin && !isOwner) throw new Error("forbidden");

    const { analyzePrescriptionImage } = await import(
      "@/lib/prescription-intelligence.server"
    );
    return analyzePrescriptionImage(data.imageUrl);
  });
