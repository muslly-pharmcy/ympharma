// Phase 7 — server function wrappers around the prescription extractor
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const RunInput = z.object({ extraction_id: z.string().uuid() });

export const runExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RunInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { extractPrescriptionFile } = await import("@/lib/prescription-extractor.server");
    return await extractPrescriptionFile(data.extraction_id);
  });

export const runPendingBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ limit: z.number().int().min(1).max(20).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: isOwner } = await supabase.rpc("has_role", { _user_id: userId, _role: "owner" });
    if (!isAdmin && !isOwner) throw new Error("Forbidden");
    const { processPendingExtractions } = await import("@/lib/prescription-extractor.server");
    return await processPendingExtractions(data.limit ?? 5);
  });
