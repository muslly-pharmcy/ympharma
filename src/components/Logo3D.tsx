import { useRef, Suspense, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, useTexture, Stars, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Pause, Play } from "lucide-react";
import logoAsset from "@/assets/almosly-logo.png.asset.json";

function LogoMesh({ logoUrl, animate }: { logoUrl: string; animate: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(logoUrl);

  useFrame((state) => {
    if (!meshRef.current || !animate) return;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
  });

  return (
    <Float speed={animate ? 1.2 : 0} rotationIntensity={animate ? 0.25 : 0} floatIntensity={animate ? 0.6 : 0}>
      <mesh ref={meshRef} castShadow>
        <planeGeometry args={[3.2, 3.2]} />
        <meshStandardMaterial
          map={texture}
          transparent
          side={THREE.DoubleSide}
          emissive={new THREE.Color("#14b8a6")}
          emissiveIntensity={0.35}
          emissiveMap={texture}
          metalness={0.4}
          roughness={0.25}
        />
      </mesh>
    </Float>
  );
}

function detectPerformance(): "low" | "high" {
  if (typeof navigator === "undefined") return "high";
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const cores = navigator.hardwareConcurrency ?? 4;
  if ((mem !== undefined && mem <= 4) || cores <= 4) return "low";
  return "high";
}

function detectWebGL(): boolean {
  if (typeof document === "undefined") return true;
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export type Logo3DProps = {
  logoUrl?: string;
  className?: string;
};

export function Logo3D({ logoUrl = logoAsset.url, className = "" }: Logo3DProps) {
  const [mounted, setMounted] = useState(false);
  const [webglOk, setWebglOk] = useState(true);
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    setMounted(true);
    setWebglOk(detectWebGL());
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      setPrefersReduced(mq.matches);
      if (mq.matches) setAnimate(false);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const tier = useMemo(() => (mounted ? detectPerformance() : "high"), [mounted]);
  const isLow = tier === "low";

  const staticFallback = (
    <div
      className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 shadow-elevated ring-1 ring-white/10 ${className}`}
    >
      <div className="aspect-[16/10] sm:aspect-[16/8]">
        <img
          src={logoUrl}
          alt="شعار صيدلية المصلي ALMOSLY PHARMACY"
          className="h-full w-full object-contain p-6 drop-shadow-[0_0_25px_rgba(20,184,166,0.45)]"
          loading="eager"
          decoding="async"
        />
      </div>
    </div>
  );

  // SSR / pre-hydration: render static logo (good for SEO & first paint)
  if (!mounted) return staticFallback;

  // WebGL unavailable: keep static fallback
  if (!webglOk) return staticFallback;

  return (
    <div
      dir="ltr"
      className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 shadow-elevated ring-1 ring-white/10 ${className}`}
    >
      <div className="aspect-[16/10] sm:aspect-[16/8] w-full touch-none">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          dpr={isLow ? [1, 1.25] : [1, 2]}
          gl={{ antialias: !isLow, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setWebglOk(false);
            });
          }}
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <pointLight position={[-4, -2, -3]} intensity={0.8} color="#14b8a6" />
            <pointLight position={[4, 3, 2]} intensity={0.6} color="#22d3ee" />

            <LogoMesh logoUrl={logoUrl} animate={animate} />

            <Stars
              radius={50}
              depth={50}
              count={isLow ? 350 : 1200}
              factor={3}
              saturation={0}
              fade
              speed={animate ? 1 : 0}
            />
            <Sparkles
              count={isLow ? 20 : 60}
              scale={8}
              size={3}
              speed={animate ? 0.4 : 0}
              color="#5eead4"
            />

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableRotate
              autoRotate={animate}
              autoRotateSpeed={0.8}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 2.6}
              rotateSpeed={0.8}
            />

            <EffectComposer enabled={!isLow}>
              <Bloom
                intensity={isLow ? 0.3 : 0.9}
                luminanceThreshold={0.15}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      <button
        type="button"
        onClick={() => setAnimate((v) => !v)}
        aria-label={animate ? "إيقاف الحركة" : "تشغيل الحركة"}
        aria-pressed={!animate}
        className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
      >
        {animate ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {animate ? "إيقاف الحركة" : "تشغيل الحركة"}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-bold tracking-[0.3em] text-white/60">
        ALMOSLY PHARMACY • 3D INTERACTIVE
      </div>

      {prefersReduced && (
        <span className="sr-only">الحركة معطّلة احترامًا لتفضيلات النظام</span>
      )}
    </div>
  );
}

export default Logo3D;
