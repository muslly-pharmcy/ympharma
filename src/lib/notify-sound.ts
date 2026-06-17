// Simple WebAudio beep for admin notifications. No assets needed.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

export function playNotificationBeep() {
  const ac = getCtx();
  if (!ac) return;
  try {
    const now = ac.currentTime;
    [880, 1320].forEach((freq, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, now + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.32);
      o.connect(g).connect(ac.destination);
      o.start(now + i * 0.18);
      o.stop(now + i * 0.18 + 0.35);
    });
  } catch {
    /* ignore */
  }
}
