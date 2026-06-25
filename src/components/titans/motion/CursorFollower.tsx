import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useState } from "react";

export function CursorFollower() {
  const [enabled, setEnabled] = useState(false);
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);

  const springConfig = { damping: 25, stiffness: 700 };
  const xSpring = useSpring(cursorX, springConfig);
  const ySpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return;
    setEnabled(true);
    const onMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 16);
      cursorY.set(e.clientY - 16);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [cursorX, cursorY]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[9999] h-8 w-8 rounded-full mix-blend-difference"
      style={{
        x: xSpring,
        y: ySpring,
        background:
          "radial-gradient(circle, var(--titans-gold) 0%, transparent 70%)",
      }}
    />
  );
}
