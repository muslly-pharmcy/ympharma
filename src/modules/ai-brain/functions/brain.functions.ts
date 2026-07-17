import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decide } from "../services/SuperBrainSovereign";
import type { BrainAdapter, BrainDecisionMatrix } from "../domain/types";

const InputSchema = z.object({
  userInput: z.string().min(1).max(2000),
  district: z.string().min(1).max(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
  patient: z
    .object({
      chronicConditions: z.array(z.string()).optional(),
      ageBand: z.enum(["child", "adult", "elderly"]).optional(),
      pregnant: z.boolean().optional(),
    })
    .optional(),
});

export const executeNeuralInference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InputSchema.parse(raw))
  .handler(async ({ data, context }): Promise<BrainDecisionMatrix> => {
    const { supabase, userId } = context;

    // Adapter: reads real data through the user-scoped Supabase client (RLS applies).
    const adapter: BrainAdapter = {
      async findNearbyPharmacy(medicineHint, lat, lng, _district) {
        const { data: rows, error } = await supabase.rpc("pn_search_medicine_nearby", {
          _q: medicineHint,
          _lat: lat ?? null,
          _lng: lng ?? null,
          _radius_km: 25,
          _limit: 5,
        });
        if (error || !rows || rows.length === 0) return null;
        const first = rows[0] as { pharmacy_id?: string; name?: string; distance_km?: number };
        return {
          id: first.pharmacy_id ?? "",
          name: first.name ?? "صيدلية قريبة",
          distanceKm: typeof first.distance_km === "number" ? first.distance_km : null,
        };
      },
      async suggestAlternative(medicineHint) {
        const { data: rows, error } = await supabase.rpc("search_medicines_public", {
          _q: medicineHint,
          _limit: 3,
        });
        if (error || !rows || rows.length === 0) return null;
        const first = rows[0] as { name_ar?: string; name?: string };
        return first.name_ar ?? first.name ?? null;
      },
    };

    const decision = await decide(
      {
        userId,
        userInput: data.userInput,
        district: data.district,
        lat: data.lat,
        lng: data.lng,
        patient: data.patient,
      },
      adapter,
    );

    // Best-effort log — never fail the request on logging error.
    try {
      await supabase.from("ai_neural_synaptic_log").insert({
        user_id: userId,
        trigger_source: "SOVEREIGN_BRAIN_CORE",
        target_destination: "YEMEN_EXPANSION_NETWORK",
        decision_id: decision.decisionId,
        is_safe: decision.isSafe,
        district: data.district,
        dispatched_tools: decision.dispatchedTools,
        payload_transmitted: {
          input: { userInput: data.userInput, district: data.district, patient: data.patient ?? null },
          decision,
        },
        execution_time_ms: decision.executionSpeedMs,
      });
    } catch (err) {
      console.warn("[ai-brain] neural log insert failed:", (err as Error).message);
    }

    return decision;
  });
