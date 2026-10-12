import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, BackSide } from 'three'
import { Label } from './Label'
import { Portal } from './Portal'

const SPOTS = [[0.28, 0.16, 0.1], [-0.3, 0.12, 0.22], [0.02, 0.24, -0.26], [-0.12, 0.2, 0.3], [0.34, 0.08, -0.12]]

// A trippy 70s clearing: a choir of magic mushrooms that bob, sway, open their mouths
// to sing and wave their arms, under cycling psychedelic skies. All animation mutates
// refs in useFrame (no per-frame React state). The exit portal is in view on arrival.
export function TrippyWorld({ onExit, onPointerDown }) {
  const mushrooms = useRef([])
  const mouths = useRef([])
  const caps = useRef([])
  const notes = useRef()
  const sky = useRef()
  const ground = useRef()
  const disco = useRef()
  const color = useRef(new Color())

  const shrooms = useMemo(() => Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.35
    const r = i % 2 ? 3.1 : 2.35
    return { x: Math.cos(a) * r, z: Math.sin(a) * r - 0.6, scale: 0.75 + (i % 4) * 0.22, hue: i / 10, phase: i * 1.37, face: Math.atan2(-Math.cos(a) * r, -(Math.sin(a) * r - 0.6)) }
  }), [])
  const noteData = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ a: i * 0.9, r: 1.5 + (i % 3) * 0.7, h: 1.4 + (i % 4) * 0.35, phase: i * 1.1 })), [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    shrooms.forEach((m, i) => {
      const g = mushrooms.current[i]; if (!g) return
      const bounce = Math.abs(Math.sin(t * 2.1 + m.phase))
      g.position.y = bounce * 0.22
      g.rotation.z = Math.sin(t * 2.1 + m.phase) * 0.16
      g.rotation.x = Math.cos(t * 1.7 + m.phase) * 0.08
      const mouth = mouths.current[i]
      if (mouth) mouth.scale.set(1, 0.35 + Math.abs(Math.sin(t * 3.2 + m.phase * 2)) * 1.1, 1) // singing
      const cap = caps.current[i]
      if (cap) { color.current.setHSL((m.hue + t * 0.05) % 1, 0.85, 0.55); cap.material.color.copy(color.current); cap.material.emissive.copy(color.current).multiplyScalar(0.35) }
    })
    if (notes.current) notes.current.children.forEach((n, i) => {
      const d = noteData[i]
      const a = d.a + t * 0.35
      n.position.set(Math.cos(a) * d.r, d.h + Math.sin(t * 1.4 + d.phase) * 0.25, Math.sin(a) * d.r - 0.6)
      n.rotation.y = -a
    })
    if (sky.current) { color.current.setHSL((t * 0.03) % 1, 0.65, 0.32); sky.current.material.color.copy(color.current) }
    if (ground.current) { color.current.setHSL((t * 0.03 + 0.45) % 1, 0.6, 0.3); ground.current.material.color.copy(color.current) }
    if (disco.current) { disco.current.rotation.y = t * 0.25; disco.current.position.y = 3.1 + Math.sin(t * 0.9) * 0.2 }
  })

  return (
    <group name="trippy world" onPointerDown={onPointerDown}>
      <hemisphereLight args={['#ffe6ff', '#332255', 0.9]} />
      <pointLight position={[0, 3.4, -0.6]} intensity={30} distance={18} decay={1.6} color="#ff9ff3" />
      <pointLight position={[-3, 1.6, 2]} intensity={12} distance={12} decay={1.8} color="#54e0ff" />

      <mesh ref={sky} name="trippy sky"><sphereGeometry args={[22, 24, 16]} /><meshBasicMaterial side={BackSide} color="#3b1163" /></mesh>
      <mesh ref={ground} name="trippy ground" rotation-x={-Math.PI / 2} position={[0, 0, -0.6]}>
        <circleGeometry args={[11, 48]} /><meshStandardMaterial color="#225533" roughness={1} />
      </mesh>
      {[1.2, 2.0, 2.8].map((r, i) => (
        <mesh key={r} name={`rainbow ring ${i}`} rotation-x={-Math.PI / 2} position={[0, 0.012 + i * 0.004, -0.6]}>
          <ringGeometry args={[r, r + 0.14, 48]} /><meshBasicMaterial color={['#ff6b9d', '#ffd93d', '#6bcbff'][i]} toneMapped={false} />
        </mesh>
      ))}

      <Label position={[0, 3.15, -3.4]} size={0.22} weight={600} color="#ffe66d" text="The Mushroom Choir" name="trippy title" />
      <Label position={[0, 2.78, -3.4]} size={0.11} weight={600} color="#ffffff" text="♪ la la la ♪" name="trippy song" />

      {shrooms.map((m, i) => (
        <group key={i} ref={(el) => (mushrooms.current[i] = el)} name={`singing mushroom ${i}`}
          position={[m.x, 0, m.z]} rotation-y={m.face} scale={m.scale}>
          {/* stem + waving arms */}
          <mesh name={`mushroom stem ${i}`} position-y={0.42} castShadow>
            <cylinderGeometry args={[0.13, 0.18, 0.84, 12]} /><meshStandardMaterial color="#fff3d6" roughness={0.8} />
          </mesh>
          <mesh name={`mushroom arm left ${i}`} position={[-0.3, 0.62, 0]} rotation-z={0.9}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} /><meshStandardMaterial color="#fff3d6" roughness={0.8} />
          </mesh>
          <mesh name={`mushroom arm right ${i}`} position={[0.3, 0.62, 0]} rotation-z={-0.9}>
            <cylinderGeometry args={[0.035, 0.035, 0.5, 8]} /><meshStandardMaterial color="#fff3d6" roughness={0.8} />
          </mesh>
          {/* cap with spots */}
          <mesh ref={(el) => (caps.current[i] = el)} name={`mushroom cap ${i}`} position-y={0.92} scale={[1, 0.62, 1]} castShadow>
            <sphereGeometry args={[0.52, 20, 14]} /><meshStandardMaterial color="#ff3d7f" emissive="#ff3d7f" emissiveIntensity={0.35} roughness={0.5} />
          </mesh>
          {SPOTS.map(([x, y, z], s) => (
            <mesh key={s} name={`mushroom spot ${i}-${s}`} position={[x, 0.92 + y, z]} scale={[1, 0.5, 1]}>
              <sphereGeometry args={[0.09, 10, 8]} /><meshBasicMaterial color="#ffffff" />
            </mesh>
          ))}
          {/* face on the stem, turned toward the clearing centre */}
          {[-0.09, 0.09].map((x, e) => (
            <mesh key={e} name={`mushroom eye ${i}-${e}`} position={[x, 0.58, 0.145]}>
              <sphereGeometry args={[0.032, 10, 8]} /><meshBasicMaterial color="#241430" />
            </mesh>
          ))}
          <mesh ref={(el) => (mouths.current[i] = el)} name={`mushroom mouth ${i}`} position={[0, 0.4, 0.15]}>
            <sphereGeometry args={[0.055, 12, 10]} /><meshBasicMaterial color="#5b1030" />
          </mesh>
          {/* 70s platform shoes */}
          {[-0.11, 0.11].map((x, f) => (
            <mesh key={f} name={`mushroom shoe ${i}-${f}`} position={[x, 0.045, 0.05]}>
              <boxGeometry args={[0.15, 0.09, 0.3]} /><meshStandardMaterial color={f ? '#ffd93d' : '#ff6b9d'} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* floating musical notes circling the choir */}
      <group ref={notes} name="music notes">
        {noteData.map((d, i) => (
          <group key={i} name={`music note ${i}`}>
            <mesh name={`note head ${i}`} rotation-z={-0.4}><sphereGeometry args={[0.11, 12, 10]} /><meshBasicMaterial color={i % 2 ? '#ffd93d' : '#6bcbff'} toneMapped={false} /></mesh>
            <mesh name={`note stem ${i}`} position={[0.1, 0.22, 0]}><boxGeometry args={[0.035, 0.45, 0.035]} /><meshBasicMaterial color={i % 2 ? '#ffd93d' : '#6bcbff'} toneMapped={false} /></mesh>
          </group>
        ))}
      </group>

      <group ref={disco} name="disco balls" position={[0, 3.1, -0.6]}>
        {[[0, 0, 0, 0.34], [-2.4, -0.5, 1.6, 0.22], [2.4, -0.4, 1.4, 0.26]].map(([x, y, z, r], i) => (
          <mesh key={i} name={`disco ball ${i}`} position={[x, y, z]}>
            <sphereGeometry args={[r, 18, 14]} /><meshStandardMaterial color="#e8e6ff" metalness={0.9} roughness={0.18} emissive="#8888ff" emissiveIntensity={0.25} />
          </mesh>
        ))}
      </group>

      {/* way back — ahead-left of where you arrive, so you can see it straight away */}
      <Portal exit closeWorld={onExit} position={[-1.7, 1.2, -1.75]} rotationY={1.07} portalScale={1.35} />
    </group>
  )
}
