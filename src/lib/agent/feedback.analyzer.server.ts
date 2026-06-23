// Feedback Analyzer — Phase 3 (P3-GATE-01).
// Computes Pearson correlation between predicted `confidence_score` and the
// observed engagement on published posts, persists the result to
// `confidence_calibration_log`, and raises severity when the correlation
// drops below safe thresholds.
//
// Server-only. Non-blocking — never throws to caller (P3-GATE-05).

const CRITICAL_THRESHOLD = 0.3;
const WARN_THRESHOLD = 0.5;

function pearson(x: number[], y: number[]): number | null {
  const n = x.length;
  if (n < 5) return null;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx2 = 0;
  let dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  if (den === 0) return 0;
  return num / den;
}

export interface CalibrationResult {
  ok: boolean;
  correlation?: number | null;
  sample_size?: number;
  severity?: "info" | "warning" | "critical";
  reason?: string;
}

export async function analyzeConfidenceCalibration(windowDays = 7): Promise<CalibrationResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - windowDays * 86_400_000).toISOString();

    const { data: rows, error } = await supabaseAdmin
      .from("social_posts")
      .select("id,confidence_score,social_post_stats(likes,comments,shares,views)")
      .gte("created_at", since)
      .eq("status", "published")
      .not("confidence_score", "is", null);
    if (error) return { ok: false, reason: error.message };

    const pairs: Array<{ c: number; e: number }> = [];
    for (const r of rows ?? []) {
      const c = Number((r as any).confidence_score);
      const s = Array.isArray((r as any).social_post_stats)
        ? (r as any).social_post_stats[0]
        : (r as any).social_post_stats;
      if (!s) continue;
      const e = (s.likes ?? 0) + (s.comments ?? 0) * 2 + (s.shares ?? 0) * 3;
      if (Number.isFinite(c) && Number.isFinite(e)) pairs.push({ c, e });
    }

    const n = pairs.length;
    if (n < 5) {
      await supabaseAdmin.from("confidence_calibration_log").insert({
        window_days: windowDays,
        sample_size: n,
        correlation: null,
        severity: "info",
        notes: "sample_too_small",
      });
      return { ok: true, sample_size: n, severity: "info", reason: "sample_too_small" };
    }

    const corr = pearson(pairs.map((p) => p.c), pairs.map((p) => p.e));
    const meanC = pairs.reduce((s, p) => s + p.c, 0) / n;
    const meanE = pairs.reduce((s, p) => s + p.e, 0) / n;

    // Severity by absolute correlation (negative correlation is also bad)
    const absC = corr == null ? 0 : Math.abs(corr);
    const severity: "info" | "warning" | "critical" =
      corr == null || absC < CRITICAL_THRESHOLD ? "critical" : absC < WARN_THRESHOLD ? "warning" : "info";

    // Drift = previous correlation − current
    let drift: number | null = null;
    const { data: prev } = await supabaseAdmin
      .from("confidence_calibration_log")
      .select("correlation")
      .order("computed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prev?.correlation != null && corr != null) drift = Number(prev.correlation) - corr;

    await supabaseAdmin.from("confidence_calibration_log").insert({
      window_days: windowDays,
      sample_size: n,
      correlation: corr == null ? null : Number(corr.toFixed(4)),
      mean_confidence: Number(meanC.toFixed(4)),
      mean_engagement: Number(meanE.toFixed(2)),
      drift: drift == null ? null : Number(drift.toFixed(4)),
      severity,
      notes: severity === "critical" ? "correlation_below_threshold" : null,
    });

    if (severity === "critical") {
      console.warn(`[calibration] CRITICAL — corr=${corr} n=${n}; manual review required.`);
    }

    return { ok: true, correlation: corr, sample_size: n, severity };
  } catch (e) {
    console.error("[feedback.analyzer]", (e as Error).message);
    return { ok: false, reason: (e as Error).message };
  }
}
