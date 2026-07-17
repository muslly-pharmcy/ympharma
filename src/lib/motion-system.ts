/**
 * Motion System 2026 — durations and easings for MUSLLY AI OS.
 * Mirrors CSS custom properties in src/styles.css.
 */
export const MotionSystem = {
  fast: 0.15,
  normal: 0.4,
  smooth: 0.8,
  cinematic: 1.6,
  aiTransition: 2.4,
} as const;

export const MotionEase = {
  ai: [0.22, 1, 0.36, 1] as [number, number, number, number],
  soft: [0.4, 0, 0.2, 1] as [number, number, number, number],
};
