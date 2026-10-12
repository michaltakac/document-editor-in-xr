import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { usePress } from '../lib/interaction'
import { Label } from './Label'

// Portal on the front wall that opens a trippy world
export function Portal({ openWorld, closeWorld }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)
  const [pulse, setPulse] = useState(1)

  // Pulse animation when hovering
  useFrame((_, dt) => {
    if (hovered) {
      setPulse(1 + Math.sin(Date.now() * 0.005) * 0.15)
    } else {
      setPulse(1)
    }
  })

  const handlePress = () => {
    if (openWorld) openWorld()
  }

  return (
    <group name="portal" position={[0, 2.2, 2]} rotation-y={Math.PI}>
      {/* Portal frame */}
      <mesh
        ref={meshRef}
        name="portal frame"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerDown={handlePress}
      >
        <boxGeometry args={[2.2, 3.2, 0.15]} />
        <meshStandardMaterial 
          color={hovered ? '#f0a030' : '#d48020'} 
          roughness={0.3} 
          metalness={0.7} 
        />
      </mesh>

      {/* Portal opening (glowing effect) */}
      <mesh name="portal opening" position-z={0.08}>
        <boxGeometry args={[1.8, 2.8, 0.05]} />
        <meshStandardMaterial 
          color="#221155" 
          emissive={hovered ? '#4422aa' : '#331188'} 
          emissiveIntensity={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Portal label */}
      <Label
        position={[0, 1.9, 0.15]}
        text="Enter Portal"
        color={hovered ? '#fff' : '#ffd080'}
        size={0.06}
        weight={600}
      />
      
      {/* Animated portal swirl (simple spiral) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          name={`portal swirl ${i}`}
          position={[Math.cos(i * 0.785) * 0.5, Math.sin(i * 0.785) * 0.5, 0.1]}
          scale={pulse}
        >
          <sphereGeometry args={[0.08, 16, 12]} />
          <meshBasicMaterial 
            color={`hsl(${(i * 45 + Date.now() * 0.02) % 360}, 80%, 60%)`} 
            transparent 
            opacity={0.7} 
          />
        </mesh>
      ))}
    </group>
  )
}