import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Text, Html } from '@react-three/drei'
import * as THREE from 'three'
import { useNavigate } from '@tanstack/react-router'
import { getActivePlanets } from '@/data/planets'

// Sun Component
function Sun() {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
      glowRef.current.scale.set(scale, scale, scale)
    }
  })

  const sunMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#C9A227',
      emissive: '#FFD700',
      emissiveIntensity: 0.8,
      roughness: 0.4,
      metalness: 0.6,
    })
  }, [])

  return (
    <group>
      {/* Main sun body */}
      <mesh ref={meshRef} material={sunMaterial}>
        <sphereGeometry args={[1.5, 64, 64]} />
      </mesh>

      {/* Glow layers */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2, 32, 32]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.15} side={THREE.BackSide} />
      </mesh>

      <mesh>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial color="#C9A227" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>

      {/* Light */}
      <pointLight color="#FFD700" intensity={2} distance={50} />
      <pointLight color="#FFA500" intensity={1} distance={30} />
    </group>
  )
}

// Planet Component
function Planet3D({ 
  position, 
  color, 
  size, 
  orbitRadius, 
  orbitSpeed, 
  name, 
  icon,
  planetId 
}: {
  position: [number, number, number]
  color: string
  size: number
  orbitRadius: number
  orbitSpeed: number
  name: string
  icon: string
  planetId: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const navigate = useNavigate()

  useFrame((state) => {
    if (groupRef.current) {
      const angle = state.clock.elapsedTime * orbitSpeed
      groupRef.current.position.x = Math.cos(angle) * orbitRadius
      groupRef.current.position.z = Math.sin(angle) * orbitRadius
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  const planetMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.7,
    })
  }, [color])

  return (
    <group ref={groupRef} position={position}>
      {/* Orbit ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[orbitRadius - 0.05, orbitRadius + 0.05, 128]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} side={THREE.DoubleSide} />
      </mesh>

      {/* Planet */}
      <mesh
        ref={meshRef}
        material={planetMaterial}
        onClick={() => navigate({ to: '/planet/$planetId', params: { planetId } })}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered ? size * 1.3 : size}
      >
        <sphereGeometry args={[1, 32, 32]} />
      </mesh>

      {/* Glow */}
      <mesh scale={hovered ? size * 1.5 : size * 1.2}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} side={THREE.BackSide} />
      </mesh>

      {/* Label */}
      <Html distanceFactor={10}>
        <div 
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            hovered ? 'bg-white shadow-lg scale-110' : 'bg-white/80'
          }`}
          style={{ color }}
          onClick={() => navigate({ to: '/planet/$planetId', params: { planetId } })}
        >
          <span className="mr-1">{icon}</span>
          {name}
        </div>
      </Html>
    </group>
  )
}

// Orbit Lines
function OrbitLines() {
  const planets = getActivePlanets()

  return (
    <group>
      {planets.map((planet, i) => {
        const radius = 4 + i * 1.2
        return (
          <mesh key={planet.id} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius - 0.02, radius + 0.02, 128]} />
            <meshBasicMaterial color={planet.color} transparent opacity={0.08} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

// Particle Field
function ParticleField() {
  const particlesRef = useRef<THREE.Points>(null)
  const count = 1000

  const [positions, velocities] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const vel = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50
      vel[i * 3] = (Math.random() - 0.5) * 0.01
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.01
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.01
    }
    return [pos, vel]
  }, [])

  useFrame(() => {
    if (!particlesRef.current) return
    const pos = particlesRef.current.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      pos[i * 3] += velocities[i * 3]
      pos[i * 3 + 1] += velocities[i * 3 + 1]
      pos[i * 3 + 2] += velocities[i * 3 + 2]

      if (Math.abs(pos[i * 3]) > 25) pos[i * 3] *= -0.9
      if (Math.abs(pos[i * 3 + 1]) > 25) pos[i * 3 + 1] *= -0.9
      if (Math.abs(pos[i * 3 + 2]) > 25) pos[i * 3 + 2] *= -0.9
    }
    particlesRef.current.geometry.attributes.position.needsUpdate = true
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#C9A227" transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

// Main Scene
function Scene() {
  const planets = getActivePlanets()

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Sun />

      <OrbitLines />

      {planets.map((planet, i) => (
        <Planet3D
          key={planet.id}
          position={[0, 0, 0]}
          color={planet.color}
          size={0.3 + (16 - i) * 0.02}
          orbitRadius={4 + i * 1.2}
          orbitSpeed={0.1 / (i + 1)}
          name={planet.nameAr}
          icon={planet.icon}
          planetId={planet.id}
        />
      ))}

      <ParticleField />

      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        maxDistance={30} 
        minDistance={5}
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export default function SolarSystem3D() {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-surface-dark">
      <Canvas camera={{ position: [0, 15, 20], fov: 60 }}>
        <Scene />
      </Canvas>
    </div>
  )
}
