/**
 * DemandPredictor — weighted moving average with +15% growth heuristic.
 */
export class DemandPredictor {
  predict(history: number[]): { next: number; confidence: number } {
    if (!history.length) return { next: 0, confidence: 0 };
    // Weight recent periods higher.
    const weights = history.map((_, i) => i + 1);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const weighted =
      history.reduce((acc, v, i) => acc + v * weights[i], 0) / wsum;
    const next = Math.round(weighted * 1.15);
    // Confidence rises with number of observations, capped at 0.9.
    const confidence = Math.min(0.5 + history.length * 0.08, 0.9);
    return { next, confidence: Math.round(confidence * 100) / 100 };
  }
}
