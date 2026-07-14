// Phoenix Phase 3 — profile server functions.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { UserProfile } from "./types";

const UpdateSchema = z.object({
  display_name: z.string().min(1).max(200).optional(),
  avatar_url: z.string().url().optional().nullable(),
  phone: z.string().min(3).max(40).optional().nullable(),
  preferred_language: z.string().min(2).max(10).optional(),
  notification_prefs: z.record(z.string(), z.any()).optional(),
});

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserProfile | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles" as never)
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as UserProfile | null) ?? null;
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => UpdateSchema.parse(input))
  .handler(async ({ data, context }): Promise<UserProfile> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("profiles" as never)
      .update(data as never)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return row as UserProfile;
  });

export const completeMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UserProfile> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles" as never)
      .update({ profile_completed_at: new Date().toISOString() } as never)
      .eq("id", userId)
      .select("*")
      .single();
    if (error) throw error;
    return data as UserProfile;
  });
