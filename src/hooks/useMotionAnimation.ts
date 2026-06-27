// ============================================================
// useMotionAnimation — variants framer-motion قياسية للوحات الإدارة
// ============================================================
// hook خفيف يُصدِّر مجموعات variants جاهزة لإعادة الاستخدام عبر الـ UI.

import type { Variants } from "framer-motion";

export interface MotionPreset {
  list: Variants;
  item: Variants;
  fadeIn: Variants;
}

const PRESET: MotionPreset = {
  list: {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.04 },
    },
  },
  item: {
    hidden: { opacity: 0, y: -4 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
    exit: { opacity: 0, x: 16, transition: { duration: 0.15 } },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
  },
};

export function useMotionAnimation(): MotionPreset {
  return PRESET;
}
