// The place everyone meets: a warm lounge built in code — oak floor, plaster walls, a tall window that
// lights the room, two ceiling lamps, a rug and a round table in the middle for the shared objects.
import { useEffect, useMemo } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, Color, EquirectangularReflectionMapping, RepeatWrapping, SRGBColorSpace } from 'three'
import { TABLE } from '../lib/spawn'

export const ROOM = { w: 6.4, d: 6.4, h: 3.0 } // metres; the floor is y = 0, the room is centred on x = 0, z = -1.2
const CZ = -1.2

function plankTexture() {
  const c = document.createElement('canvas').getContext('2d')
  c.canvas.width = 1024
  c.canvas.height = 1024
  const rows = 8, cols = 4
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * 128
    for (let k = -1; k < cols + 1; k++) {
      const x = k * 256 + offset, y = r * 128
      const tone = 0.85 + Math.sin(r * 12.9 + k * 7.1) * 0.08
      c.fillStyle = new Color(0.62 * tone, 0.46 * tone, 0.31 * tone).getStyle()
      c.fillRect(x, y, 256, 128)
      c.strokeStyle = 'rgba(40, 24, 12, 0.5)'
      c.lineWidth = 3
      c.strokeRect(x + 1, y + 1, 254, 126)
      c.strokeStyle = 'rgba(60, 40, 20, 0.18)'
      c.lineWidth = 1
      for (let g = 0; g < 10; g++) { c.beginPath(); const yy = y + 10 + g * 11 + Math.sin(k + g) * 3; c.moveTo(x, yy); c.bezierCurveTo(x + 80, yy + 4, x + 180, yy - 4, x + 256, yy + 2); c.stroke() }
    }
  }
  const t = new CanvasTexture(c.canvas)
  t.colorSpace = SRGBColorSpace
  t.wrapS = t.wrapT = RepeatWrapping
  t.repeat.set(ROOM.w / 2, ROOM.d / 2)
  t.anisotropy = 8
  return t
}

// A soft room-coloured environment: it gives the materials their reflections and fill light.
function envTexture() {
  const c = document.createElement('canvas').getContext('2d')
  c.canvas.width = 512
  c.canvas.height = 256
  const g = c.createLinearGradient(0, 0, 0, 256)
  g.addColorStop(0, '#fff6ea')
  g.addColorStop(0.5, '#e8dccb')
  g.addColorStop(1, '#6b5540')
  c.fillStyle = g
  c.fillRect(0, 0, 512, 256)
  const w = c.createRadialGradient(128, 110, 0, 128, 110, 110)
  w.addColorStop(0, 'rgba(255,255,255,1)')
  w.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = w
  c.fillRect(0, 0, 512, 256)
  const t = new CanvasTexture(c.canvas)
  t.colorSpace = SRGBColorSpace
  t.mapping = EquirectangularReflectionMapping
  return t
}

export function Room() {
  const planks = useMemo(plankTexture, [])
  const env = useMemo(envTexture, [])
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    scene.environment = env
    scene.environmentIntensity = 0.45
    scene.background = new Color('#2a2622')
    return () => { scene.environment = null; scene.background = null }
  }, [scene, env])
  const { w, d, h } = ROOM
  const wall = <meshStandardMaterial color="#e9dfd2" roughness={0.95} />
  return (
    <group name="room">
      <hemisphereLight args={['#fff4e6', '#7a6a58', 0.45]} />
      {/* daylight through the window on the left wall */}
      <directionalLight
        position={[-2.6, 2.4, -0.4]} target-position={[0.6, 0.6, CZ]} intensity={1.6} color="#fff1dc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} shadow-normalBias={0.02} shadow-radius={5}
        shadow-camera-left={-4} shadow-camera-right={4} shadow-camera-top={4} shadow-camera-bottom={-4} shadow-camera-near={0.5} shadow-camera-far={12}
      />
      <pointLight position={[-1.1, h - 0.45, CZ]} intensity={6} distance={7} decay={2} color="#ffd9a8" />
      <pointLight position={[1.1, h - 0.45, CZ]} intensity={6} distance={7} decay={2} color="#ffd9a8" />

      <mesh name="floor" rotation-x={-Math.PI / 2} position={[0, 0, CZ]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial map={planks} roughness={0.55} metalness={0.02} />
      </mesh>
      <mesh name="ceiling" rotation-x={Math.PI / 2} position={[0, h, CZ]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#f6f1ea" roughness={1} />
      </mesh>
      <mesh name="wall back" position={[0, h / 2, CZ - d / 2]} receiveShadow><planeGeometry args={[w, h]} />{wall}</mesh>
      <mesh name="wall front" position={[0, h / 2, CZ + d / 2]} rotation-y={Math.PI} receiveShadow><planeGeometry args={[w, h]} />{wall}</mesh>
      <mesh name="wall right" position={[w / 2, h / 2, CZ]} rotation-y={-Math.PI / 2} receiveShadow><planeGeometry args={[d, h]} />{wall}</mesh>
      <mesh name="wall left" position={[-w / 2, h / 2, CZ]} rotation-y={Math.PI / 2} receiveShadow><planeGeometry args={[d, h]} />{wall}</mesh>
      {/* skirting */}
      {[[0, CZ - d / 2 + 0.03, 0, w], [0, CZ + d / 2 - 0.03, 0, w], [w / 2 - 0.03, CZ, Math.PI / 2, d], [-w / 2 + 0.03, CZ, Math.PI / 2, d]].map(([x, z, ry, len], i) => (
        <mesh key={i} name="skirting" position={[x, 0.06, z]} rotation-y={ry}>
          <boxGeometry args={[len, 0.12, 0.06]} />
          <meshStandardMaterial color="#f7f3ee" roughness={0.6} />
        </mesh>
      ))}

      {/* the window: a bright pane with a frame on the left wall */}
      <group position={[-w / 2 + 0.02, 1.7, -0.6]} rotation-y={Math.PI / 2}>
        <mesh name="window frame"><boxGeometry args={[1.9, 1.7, 0.08]} /><meshStandardMaterial color="#f7f3ee" roughness={0.6} /></mesh>
        <mesh name="window" position-z={0.05}><planeGeometry args={[1.72, 1.52]} /><meshBasicMaterial color="#dff0ff" toneMapped={false} /></mesh>
        <mesh name="window bar" position-z={0.06}><boxGeometry args={[0.04, 1.52, 0.02]} /><meshStandardMaterial color="#f7f3ee" /></mesh>
        <mesh name="window bar" position-z={0.06}><boxGeometry args={[1.72, 0.04, 0.02]} /><meshStandardMaterial color="#f7f3ee" /></mesh>
      </group>

      {/* ceiling lamps */}
      {[-1.1, 1.1].map((x) => (
        <group key={x} position={[x, h - 0.3, CZ]}>
          <mesh name="lamp cord" position-y={0.15}><cylinderGeometry args={[0.006, 0.006, 0.3, 8]} /><meshStandardMaterial color="#2b2b2b" /></mesh>
          <mesh name="lamp shade" castShadow><coneGeometry args={[0.26, 0.22, 32, 1, true]} /><meshStandardMaterial color="#2f3440" roughness={0.6} side={2} /></mesh>
          <mesh name="lamp bulb" position-y={-0.06}><sphereGeometry args={[0.05, 16, 12]} /><meshBasicMaterial color="#ffe6bd" toneMapped={false} /></mesh>
        </group>
      ))}

      {/* rug and table */}
      <mesh name="rug" rotation-x={-Math.PI / 2} position={[TABLE.x, 0.006, TABLE.z]} receiveShadow>
        <circleGeometry args={[1.9, 64]} />
        <meshStandardMaterial color="#8c5a4a" roughness={1} />
      </mesh>
      <mesh name="rug border" rotation-x={-Math.PI / 2} position={[TABLE.x, 0.007, TABLE.z]}>
        <ringGeometry args={[1.72, 1.9, 64]} />
        <meshStandardMaterial color="#d9b48c" roughness={1} />
      </mesh>
      <mesh name="table top" position={[TABLE.x, TABLE.top - 0.02, TABLE.z]} castShadow receiveShadow>
        <cylinderGeometry args={[TABLE.radius, TABLE.radius, 0.04, 48]} />
        <meshStandardMaterial color="#5c3f2c" roughness={0.4} metalness={0.05} />
      </mesh>
      <mesh name="table stem" position={[TABLE.x, TABLE.top / 2 - 0.03, TABLE.z]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, TABLE.top - 0.06, 20]} />
        <meshStandardMaterial color="#2f3440" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh name="table foot" position={[TABLE.x, 0.015, TABLE.z]} receiveShadow>
        <cylinderGeometry args={[0.34, 0.36, 0.03, 36]} />
        <meshStandardMaterial color="#2f3440" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* a plant in the corner */}
      <group position={[2.5, 0, CZ - 2.5]}>
        <mesh name="pot" position-y={0.2} castShadow><cylinderGeometry args={[0.2, 0.16, 0.4, 24]} /><meshStandardMaterial color="#c47a56" roughness={0.9} /></mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} name="leaf" position={[Math.sin(i * 1.26) * 0.12, 0.75 + (i % 2) * 0.18, Math.cos(i * 1.26) * 0.12]} rotation={[0.5, i * 1.26, 0]} castShadow>
            <sphereGeometry args={[0.22, 12, 10]} />
            <meshStandardMaterial color="#4f8a46" roughness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  )
}
