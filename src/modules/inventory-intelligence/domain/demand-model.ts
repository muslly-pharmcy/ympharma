// Pure demand model — moving average over qty samples.
export interface DailyQty { date: string; qty: number }

export function movingAverage(samples: number[]): number {
  if (samples.length === 0) return 0;
  return samples.reduce((s, n) => s + n, 0) / samples.length;
}

export function forecastUnits(dailyAvg: number, horizonDays: 7 | 30): number {
  return Math.max(0, dailyAvg * horizonDays);
}
