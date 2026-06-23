import { useRef, Suspense, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, useTexture, Stars, Sparkles } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import logoAsset from "@/assets/almosly-logo.png.asset.json";

function LogoMesh({ logoUrl }: { logoUrl: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(logoUrl);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.004;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.12;
  });

  return (
    <Float speed={1.2} rotationIntensity={0.25} floatIntensity={0.6}>
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

export type Logo3DProps = {
  logoUrl?: string;
  className?: string;
  height?: string | number;
  autoRotate?: boolean;
  bloomIntensity?: number;
};

export function Logo3D({
  logoUrl = logoAsset.url,
  className = "",
  height = 420,
  autoRotate = true,
  bloomIntensity = 0.9,
}: Logo3DProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={`grid place-items-center rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white/80 ${className}`}
        style={{ height }}
      >
        <span className="text-sm">جاري تحميل المشهد ثلاثي الأبعاد…</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-slate-900 shadow-elevated ring-1 ring-white/10 ${className}`}
      style={{ height }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 5, 5]} intensity={1.2} />
          <pointLight position={[-4, -2, -3]} intensity={0.8} color="#14b8a6" />
          <pointLight position={[4, 3, 2]} intensity={0.6} color="#22d3ee" />

          <LogoMesh logoUrl={logoUrl} />

          <Stars radius={50} depth={50} count={1200} factor={3} saturation={0} fade speed={1} />
          <Sparkles count={60} scale={8} size={3} speed={0.4} color="#5eead4" />

          {autoRotate && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              autoRotate
              autoRotateSpeed={0.8}
              maxPolarAngle={Math.PI / 1.8}
              minPolarAngle={Math.PI / 2.6}
            />
          )}

          <EffectComposer>
            <Bloom
              intensity={bloomIntensity}
              luminanceThreshold={0.15}
              luminanceSmoothing={0.9}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[10px] font-bold tracking-[0.3em] text-white/60">
        ALMOSLY PHARMACY • 3D INTERACTIVE
      </div>
    </div>
  );
}

export default Logo3D;
