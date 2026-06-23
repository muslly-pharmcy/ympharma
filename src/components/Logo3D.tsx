import { useRef, Suspense, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Float,
  useTexture,
  Stars,
  Sparkles,
  Reflector,
} from "@react-three/drei";
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { Pause, Play } from "lucide-react";
import logoAsset from "@/assets/almosly-logo.png.asset.json";

// ============================================================
// Logo plane with light-sweep + parallax + micro-bounce
// ============================================================
function LogoMesh({
  logoUrl,
  animate,
  isLow,
}: {
  logoUrl: string;
  animate: boolean;
  isLow: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const sweepRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(logoUrl);
  const { mouse, viewport } = useThree();

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (groupRef.current) {
      // Parallax follow mouse
      const targetX = (mouse.x * viewport.width) / 40;
      const targetY = (mouse.y * viewport.height) / 40;
      groupRef.current.position.x += (targetX - groupRef.current.position.x) * 0.05;
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.05;
    }

    if (meshRef.current && animate) {
      // Floating + micro-bounce
      meshRef.current.position.y = Math.sin(t * 0.6) * 0.12;
      meshRef.current.rotation.z = Math.sin(t * 0.4) * 0.02;
    }

    if (sweepRef.current && animate) {
      // Light sweep crosses left → right and loops
      const period = 4;
      const phase = (t % period) / period; // 0..1
      sweepRef.current.position.x = -2.4 + phase * 4.8;
      const mat = sweepRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.sin(phase * Math.PI) * 0.55;
    }
  });

  return (
    <group ref={groupRef}>
      <Float speed={animate ? 1.2 : 0} rotationIntensity={animate ? 0.2 : 0} floatIntensity={animate ? 0.5 : 0}>
        <mesh ref={meshRef} castShadow>
          <planeGeometry args={[3.2, 3.2]} />
          <meshStandardMaterial
            map={texture}
            transparent
            side={THREE.DoubleSide}
            emissive={new THREE.Color("#14b8a6")}
            emissiveIntensity={0.55}
            emissiveMap={texture}
            metalness={0.5}
            roughness={0.2}
          />
        </mesh>

        {/* Light sweep — a soft white bar crossing the logo */}
        {!isLow && (
          <mesh ref={sweepRef} position={[0, 0, 0.02]}>
            <planeGeometry args={[0.45, 3.6]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={0}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Backlight glow disc behind the logo */}
        <mesh position={[0, 0, -0.3]}>
          <circleGeometry args={[2.2, 64]} />
          <meshBasicMaterial
            color="#0ea5a4"
            transparent
            opacity={0.35}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </Float>
    </group>
  );
}

// ============================================================
// Glass reflective floor (skipped on low-tier devices)
// ============================================================
function GlassFloor() {
  return (
    <Reflector
      resolution={512}
      args={[10, 10]}
      mirror={0.45}
      mixBlur={8}
      mixStrength={1.2}
      blur={[300, 100]}
      position={[0, -2.1, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {(Material, props) => (
        <Material color="#0f172a" metalness={0.85} roughness={0.6} {...props} />
      )}
    </Reflector>
  );
}

// ============================================================
// Helpers
// ============================================================
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

  if (!mounted) return staticFallback;
  if (!webglOk) return staticFallback;

  return (
    <div
      dir="ltr"
      className={`relative mx-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 shadow-elevated ring-1 ring-white/10 ${className}`}
    >
      {/* CSS atmospheric fog layer behind the canvas */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(45,212,191,0.25), transparent 55%), radial-gradient(ellipse at 70% 80%, rgba(250,204,21,0.12), transparent 60%)",
        }}
      />

      <div className="relative aspect-[16/10] sm:aspect-[16/8] w-full touch-none">
        <Canvas
          camera={{ position: [0, 0.4, 5], fov: 45 }}
          dpr={isLow ? [1, 1.25] : [1, 2]}
          gl={{ antialias: !isLow, alpha: true, powerPreference: "high-performance" }}
          onCreated={({ gl, scene }) => {
            scene.fog = new THREE.FogExp2(0x0b1220, 0.08);
            gl.domElement.addEventListener("webglcontextlost", (e) => {
              e.preventDefault();
              setWebglOk(false);
            });
          }}
        >
          <Suspense fallback={null}>
            {/* Advanced lighting */}
            <ambientLight intensity={0.55} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} castShadow />
            <pointLight position={[-4, -2, -3]} intensity={1.0} color="#14b8a6" />
            <pointLight position={[4, 3, 2]} intensity={0.8} color="#22d3ee" />
            <pointLight position={[0, -3, 2]} intensity={0.6} color="#facc15" />
            <spotLight position={[0, 6, 4]} angle={0.5} penumbra={1} intensity={0.8} color="#ffffff" />

            <LogoMesh logoUrl={logoUrl} animate={animate} isLow={isLow} />

            {/* Golden sparkles around the logo */}
            <Sparkles
              count={isLow ? 15 : 50}
              scale={[6, 4, 4]}
              size={isLow ? 3 : 5}
              speed={animate ? 0.5 : 0}
              color="#facc15"
              opacity={0.9}
            />

            {/* Cool teal sparkles for depth */}
            <Sparkles
              count={isLow ? 15 : 40}
              scale={[8, 6, 6]}
              size={2}
              speed={animate ? 0.3 : 0}
              color="#5eead4"
            />

            <Stars
              radius={50}
              depth={50}
              count={isLow ? 300 : 1000}
              factor={3}
              saturation={0}
              fade
              speed={animate ? 1 : 0}
            />

            {!isLow && <GlassFloor />}

            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableRotate
              autoRotate={animate}
              autoRotateSpeed={0.6}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 2.6}
              rotateSpeed={0.8}
            />

            <EffectComposer enabled={!isLow}>
              <Bloom
                intensity={1.1}
                luminanceThreshold={0.12}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
              <ChromaticAberration
                offset={new THREE.Vector2(0.0008, 0.0008)}
                radialModulation={false}
                modulationOffset={0}
                blendFunction={BlendFunction.NORMAL}
              />
              <Vignette eskil={false} offset={0.2} darkness={0.6} />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      <button
        type="button"
        onClick={() => setAnimate((v) => !v)}
        aria-label={animate ? "إيقاف الحركة" : "تشغيل الحركة"}
        aria-pressed={!animate}
        className="absolute end-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/20 backdrop-blur transition hover:bg-white/20"
      >
        {animate ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        {animate ? "إيقاف الحركة" : "تشغيل الحركة"}
      </button>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-bold tracking-[0.4em] text-white/70">
        ✦ ALMOSLY PHARMACY • PREMIUM 3D ✦
      </div>

      {prefersReduced && (
        <span className="sr-only">الحركة معطّلة احترامًا لتفضيلات النظام</span>
      )}
    </div>
  );
}

export default Logo3D;
