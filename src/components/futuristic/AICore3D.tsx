import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, Suspense } from "react";
import type { Mesh, Group } from "three";
import { AdditiveBlending } from "three";

function CoreSphere() {
  const inner = useRef<Mesh>(null);
  const wire = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (inner.current) inner.current.rotation.y += dt * 0.25;
    if (wire.current) {
      wire.current.rotation.y -= dt * 0.15;
      wire.current.rotation.x += dt * 0.08;
    }
  });
  return (
    <group>
      {/* Inner solid glowing core */}
      <mesh ref={inner}>
        <icosahedronGeometry args={[0.85, 3]} />
        <meshStandardMaterial
          color="#00E5FF"
          emissive="#00A8B5"
          emissiveIntensity={1.6}
          roughness={0.15}
          metalness={0.65}
        />
      </mesh>
      {/* Wireframe neural shell */}
      <mesh ref={wire}>
        <icosahedronGeometry args={[1.4, 2]} />
        <meshBasicMaterial
          color="#00E5FF"
          wireframe
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
        />
      </mesh>
      {/* Outer soft aura */}
      <mesh>
        <sphereGeometry args={[1.9, 32, 32]} />
        <meshBasicMaterial
          color="#00E5FF"
          transparent
          opacity={0.06}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function OrbitRings() {
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const ringC = useRef<Mesh>(null);
  useFrame((_, dt) => {
    if (ringA.current) ringA.current.rotation.z += dt * 0.4;
    if (ringB.current) ringB.current.rotation.x += dt * 0.35;
    if (ringC.current) {
      ringC.current.rotation.y += dt * 0.25;
      ringC.current.rotation.x -= dt * 0.15;
    }
  });
  const color = "#20D98A";
  return (
    <group>
      <mesh ref={ringA} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.3, 0.012, 16, 128]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ringB} rotation={[0, Math.PI / 3, Math.PI / 6]}>
        <torusGeometry args={[2.7, 0.008, 16, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} />
      </mesh>
      <mesh ref={ringC}>
        <torusGeometry args={[3.1, 0.006, 16, 128]} />
        <meshBasicMaterial color="#00E5FF" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

function ParticleField() {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  const positions: [number, number, number][] = Array.from({ length: 60 }, () => {
    const r = 3.5 + Math.random() * 1.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return [
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi),
    ];
  });
  return (
    <group ref={ref}>
      {positions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial
            color={i % 3 === 0 ? "#20D98A" : "#00E5FF"}
            transparent
            opacity={0.9}
          />
        </mesh>
      ))}
    </group>
  );
}

/**
 * AI Core 3D — cinematic centerpiece for the MUSLLY AI OS hero.
 * Import lazily behind <ClientOnly> to keep Three.js out of the SSR graph.
 */
export default function AICore3D({ height = 520 }: { height?: number }) {
  return (
    <div style={{ height, width: "100%" }}>
      <Canvas
        camera={{ position: [0, 0, 6.2], fov: 45 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.35} />
        <pointLight position={[5, 5, 5]} intensity={1.4} color="#00E5FF" />
        <pointLight position={[-5, -3, -4]} intensity={0.9} color="#20D98A" />
        <Suspense fallback={null}>
          <CoreSphere />
          <OrbitRings />
          <ParticleField />
        </Suspense>
      </Canvas>
    </div>
  );
}
