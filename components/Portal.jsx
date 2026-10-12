import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color } from 'three'
import { usePress } from '../lib/interaction'
import { Label } from './Label'

// A glowing doorway. In the lounge it sits on the front wall (behind spawn 0, z = 2.0)
// and takes you to the trippy world; inside that world the same door brings you back.
// One press (poke / pinch / trigger / mouse) through usePress — animation is done by
// mutating refs in useFrame, never with per-frame React state.
export function Portal({ openWorld, closeWorld, exit = false, position = [0, 1.15, 1.97], rotationY = Math.PI, portalScale = 1 }) {
  const swirl = useRef()
  const glow = useRef()
  const inner = useRef()
  const { hovered, pressed, handlers } = usePress({ onPress: () => (exit ? closeWorld?.() : openWorld?.()) })
  const color = useRef(new Color())

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (swirl.current) {
      swirl.current.rotation.z = t * 0.9
      const s = 1 + Math.sin(t * 2.2) * 0.05 + (hovered ? 0.08 : 0)
      swirl.current.scale.setScalar(s)
    }
    if (inner.current) {
      color.current.setHSL((t * 0.07 + (exit ? 0.45 : 0.78)) % 1, 0.85, hovered ? 0.62 : 0.5)
      inner.current.color.copy(color.current)
      inner.current.emissive?.copy(color.current)
    }
    if (glow.current) glow.current.material.opacity = 0.22 + Math.sin(t * 2.2) * 0.06 + (hovered ? 0.15 : 0)
  })

  const s = (pressed ? 0.96 : 1) * portalScale
  return (
    <group name={exit ? 'portal back to room' : 'portal'} position={position} rotation-y={rotationY} scale={s} {...handlers}>
      {/* frame */}
      <mesh name={exit ? 'portal back frame' : 'portal frame'} castShadow>
        <torusGeometry args={[0.78, 0.09, 14, 40]} />
        <meshStandardMaterial color={exit ? '#2ec4b6' : '#ff9f1c'} emissive={exit ? '#0b6e63' : '#7a3c00'} emissiveIntensity={hovered ? 1.2 : 0.6} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* the shimmering opening — this is the big, easy-to-hit press target */}
      <mesh name={exit ? 'portal back opening' : 'portal opening'} position-z={0.02}>
        <circleGeometry args={[0.76, 40]} />
        <meshStandardMaterial ref={inner} color="#7b2ff7" emissive="#7b2ff7" emissiveIntensity={0.9} roughness={0.4} transparent opacity={0.92} />
      </mesh>
      <mesh ref={glow} name="portal glow" position-z={0.05}>
        <circleGeometry args={[0.95, 40]} />
        <meshBasicMaterial color={exit ? '#2ec4b6' : '#ffbf69'} transparent opacity={0.25} depthWrite={false} />
      </mesh>
      {/* orbiting swirl motes */}
      <group ref={swirl} position-z={0.09}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} name={`portal swirl ${i}`} position={[Math.cos(i * 1.047) * 0.52, Math.sin(i * 1.047) * 0.52, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshBasicMaterial color={i % 2 ? '#ffe66d' : '#4ecdc4'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <Label position={[0, 1.08, 0.1]} size={0.075} weight={600} color="#ffffff"
        text={exit ? 'Back to the Room' : 'Trippy Mushroom World'} name={exit ? 'portal back label' : 'portal label'} />
      <Label position={[0, -1.02, 0.1]} size={0.05} weight={600} color="#ffe66d"
        text="Press the portal" name="portal hint" />
    </group>
  )
}
