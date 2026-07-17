// Provider ranking calculator. Runs server-side from the ranking cron.
// Reviews table is product-oriented in this project, so doctor ranking
// uses profile signals only (rating stays null until a doctor-review surface exists).
type DoctorInput = {
  id: string;
  years_experience: number | null;
  verification_status: string | null;
  trust_score: number | null;
  profile_completeness: number | null;
  telemedicine_ready: boolean | null;
};

export type RankFactors = {
  experienceComponent: number;
  verificationComponent: number;
  trustComponent: number;
  completenessComponent: number;
  telemedicineBonus: number;
};

export function calculateDoctorScore(doctor: DoctorInput) {
  const yrs = Math.min(doctor.years_experience ?? 0, 40);
  const verified = doctor.verification_status === "approved";
  const trust = Math.max(0, Math.min(100, doctor.trust_score ?? 0));
  const completeness = Math.max(0, Math.min(100, doctor.profile_completeness ?? 0));

  const factors: RankFactors = {
    experienceComponent: yrs * 1.25, // 0..50
    verificationComponent: verified ? 25 : 0,
    trustComponent: trust * 0.15, // 0..15
    completenessComponent: completeness * 0.05, // 0..5
    telemedicineBonus: doctor.telemedicine_ready ? 5 : 0,
  };
  const score =
    factors.experienceComponent +
    factors.verificationComponent +
    factors.trustComponent +
    factors.completenessComponent +
    factors.telemedicineBonus;

  const level =
    score >= 70 ? "TOP_PROVIDER" : verified ? "STANDARD_PROVIDER" : "NEW_PROVIDER";

  return { score: Math.round(score * 100) / 100, level, factors };
}

export async function refreshDoctorRankings(): Promise<{ updated: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: doctors } = await supabaseAdmin
    .from("hc_doctors")
    .select("id, years_experience, verification_status, trust_score, profile_completeness, telemedicine_ready")
    .eq("is_public", true);
  const list = (doctors ?? []) as DoctorInput[];
  if (list.length === 0) return { updated: 0 };

  const rows = list.map((d) => {
    const { score, level, factors } = calculateDoctorScore(d);
    return {
      provider_kind: "doctor",
      provider_id: d.id,
      score,
      level,
      rating: null,
      reviews_count: 0,
      years_experience: d.years_experience,
      verified: d.verification_status === "approved",
      factors,
      computed_at: new Date().toISOString(),
    };
  });

  const { error } = await supabaseAdmin
    .from("provider_ranking_scores")
    .upsert(rows as never, { onConflict: "provider_kind,provider_id" });
  if (error) throw new Error(error.message);
  return { updated: rows.length };
}
