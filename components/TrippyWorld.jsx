import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Vector3 } from 'three'

// Trippy 70s world with singing/dancing magic mushrooms
export function TrippyWorld() {
  const groupRef = useRef()
  const [time, setTime] = useState(0)
  
  // Generate mushroom positions
  const mushrooms = useMemo(() => {
    const arr = []
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2
      const dist = 2 + (i % 4) * 0.8
      arr.push({
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        y: 0.6,
        hue: (i * 30) % 360,
        scale: 0.7 + (i % 5) * 0.15,
      })
    }
    return arr
  }, [])

  useFrame((_, dt) => {
    setTime(t => t + dt)
  })

  return (
    <group ref={groupRef} name="trippy world">
      {/* Background: psychedelic colors */}
      <mesh position={[0, 3, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial 
          color={`hsl(${time * 20 % 360}, 70%, 40%)`} 
        />
      </mesh>

      {/* Mushroom floor */}
      <mesh position={[0, 0, 0]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[15, 15]} />
        <meshBasicMaterial 
          color={`hsl(${time * 30 + 180 % 360}, 60%, 35%)`} 
        />
      </mesh>

      {/* Distant psychedelic spheres (dancing) */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh
          key={i}
          name={`dance sphere ${i}`}
          position={[
            Math.sin(time * 0.5 + i * 0.5) * 6,
            3 + Math.cos(time * 0.3 + i) * 1.5,
            Math.cos(time * 0.5 + i * 0.5) * 6
          ]}
          scale={0.4 + Math.sin(time + i) * 0.2}
        >
          <sphereGeometry args={[0.5, 24, 16]} />
          <meshBasicMaterial 
            color={`hsl(${(time * 40 + i * 20) % 360}, 80%, 50%)`} 
            transparent
            opacity={0.7}
          />
        </mesh>
      ))}

      {/* Magic mushrooms */}
      {mushrooms.map((m, i) => {
        const bobY = Math.sin(time * 2 + i) * 0.15
        const swayX = Math.sin(time * 1.5 + i) * 0.1
        const swayZ = Math.cos(time * 1.5 + i) * 0.1
        const hue = (m.hue + time * 30) % 360
        
        return (
          <group key={i} name={`mushroom ${i}`}>
            {/* Mushroom stem */}
            <mesh position={[swayX, 0.35 + bobY, swayZ]}>
              <cylinderGeometry args={[0.1, 0.12, 0.6, 12]} />
              <meshBasicMaterial color="#fff" />
            </mesh>

            {/* Mushroom cap */}
            <mesh position={[swayX, 0.65 + bobY, swayZ]}>
              <sphereGeometry args={[m.scale, 16, 12]} />
              <meshBasicMaterial 
                color={`hsl(${hue}, 85%, 55%)`} 
              />
            </mesh>

            {/* Spots on cap */}
            {[0, 1, 2, 3].map((spot) => (
              <mesh
                key={spot}
                position={[
                  Math.cos(spot * 1.57) * 0.35,
                  0.65 + bobY + 0.05,
                  Math.sin(spot * 1.57) * 0.35
                ]}
                scale={0.35}
              >
                <sphereGeometry args={[0.15, 12, 8]} />
                <meshBasicMaterial color="#fff" />
              </mesh>
            ))}

            {/* Glow effect */}
            <mesh 
              position={[swayX, 0.6 + bobY, swayZ]} 
              scale={[1.2, 1.2, 1.2]}
            >
              <sphereGeometry args={[m.scale, 16, 12]} />
              <meshBasicMaterial 
                color={`hsl(${hue}, 85%, 55%)`} 
                transparent
                opacity={0.3}
              />
            </mesh>
          </group>
        )
      })}

      {/* Floating musical notes */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          name={`music note ${i}`}
          position={[
            Math.cos(time * 0.8 + i * 0.8) * 4,
            2 + Math.sin(time * 1.2 + i) * 1.5,
            Math.sin(time * 0.8 + i * 0.8) * 4
          ]}
          rotation={[0, time * 0.5 + i, 0]}
        >
          <sphereGeometry args={[0.15, 16, 12]} />
          <meshBasicMaterial 
            color={`hsl(${(time * 50 + i * 45) % 360}, 90%, 60%)`} 
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Exit sign */}
      <mesh position={[0, 3, 6]} name="exit portal">
        <boxGeometry args={[1.2, 0.6, 0.1]} />
        <meshBasicMaterial color="#ff0" />
      </mesh>
    </group>
  )
}