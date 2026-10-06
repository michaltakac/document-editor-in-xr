// A glazed floor vase with a loose bunch of tulips and ranunculus in warm, dusty tones that match the
// rug and the lamp light. Built from code (lathe vase, tube stems, petal shells): nothing is downloaded.
import { useMemo } from 'react'
import { CatmullRomCurve3, LatheGeometry, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three'

const NECK = 0.56 // top of the vase, metres above the floor

// [x, z] lean of the bloom, its height, colour, kind
const STEMS = [
  { to: [0.02, 1.18, 0.01], color: '#d98b84', kind: 'tulip' },
  { to: [-0.17, 1.06, 0.06], color: '#e8a87c', kind: 'ranunculus' },
  { to: [0.16, 1.04, -0.05], color: '#f1dcc0', kind: 'tulip' },
  { to: [0.06, 0.98, 0.18], color: '#c7686a', kind: 'ranunculus' },
  { to: [-0.08, 1.0, -0.17], color: '#e9b3a2', kind: 'tulip' },
  { to: [0.22, 0.9, 0.12], color: '#e8a87c', kind: 'tulip' },
  { to: [-0.21, 0.88, -0.06], color: '#f1dcc0', kind: 'ranunculus' },
]

function vaseGeometry() {
  const p = [[0.0, 0], [0.11, 0], [0.13, 0.04], [0.16, 0.16], [0.165, 0.26], [0.14, 0.38], [0.085, 0.48], [0.07, 0.53], [0.085, NECK], [0.075, NECK], [0.062, 0.52], [0.0, 0.5]]
  return new LatheGeometry(p.map(([r, y]) => new Vector2(r, y)), 48)
}

function Bloom({ color, kind }) {
  const petal = useMemo(() => new SphereGeometry(1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), [])
  const mat = <meshStandardMaterial color={color} roughness={0.7} side={2} />
  if (kind === 'tulip') {
    // six cupped petals standing up around the centre
    return (
      <group>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} rotation-y={(i * Math.PI) / 3 + (i % 2) * 0.3}>
            <mesh name="flower petal" geometry={petal} position={[0, 0.035, 0.012 + (i % 2) * 0.006]} rotation-x={Math.PI / 2 - 0.18 - (i % 2) * 0.12} scale={[0.026, 0.02, 0.05]} castShadow>{mat}</mesh>
          </group>
        ))}
      </group>
    )
  }
  // ranunculus: layered rings of small petals opening outward
  return (
    <group>
      {[0, 1, 2].map((ring) => [...Array(7 + ring * 2)].map((_, i, a) => (
        <group key={`${ring}-${i}`} rotation-y={(i / a.length) * Math.PI * 2 + ring * 0.4}>
          <mesh name="flower petal" geometry={petal} position={[0, 0.02 + (2 - ring) * 0.006, 0.008 + ring * 0.014]} rotation-x={0.5 + ring * 0.38} scale={[0.02 + ring * 0.004, 0.012, 0.024 + ring * 0.006]} castShadow>{mat}</mesh>
        </group>
      )))}
      <mesh name="flower center" position-y={0.03}><sphereGeometry args={[0.012, 10, 8]} /><meshStandardMaterial color="#6e7d3a" roughness={0.8} /></mesh>
    </group>
  )
}

function Stem({ to, color, kind, i }) {
  const { tube, leaf, leafAt, leafRot } = useMemo(() => {
    const end = new Vector3(...to)
    const start = new Vector3(end.x * 0.15, NECK - 0.08, end.z * 0.15)
    const mid = new Vector3(end.x * 0.55, (NECK + end.y) / 2, end.z * 0.55)
    const curve = new CatmullRomCurve3([start, mid, end])
    const at = curve.getPoint(0.35)
    return {
      tube: new TubeGeometry(curve, 24, 0.0055, 6, false),
      leaf: curve,
      leafAt: at.toArray(),
      leafRot: [0.9, Math.atan2(end.x, end.z) + (i % 2 ? 0.9 : -0.9), 0],
    }
  }, [to, i])
  return (
    <group>
      <mesh name="flower stem" geometry={tube} castShadow><meshStandardMaterial color="#5b7f45" roughness={0.8} /></mesh>
      {i % 3 !== 2 && (
        <mesh name="flower leaf" position={leafAt} rotation={leafRot} scale={[0.022, 0.13, 0.006]} castShadow>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color="#6b8f52" roughness={0.75} />
        </mesh>
      )}
      <group position={to} rotation={[to[2] * 1.2, 0, -to[0] * 1.2]}>
        <mesh name="flower sepal" position-y={0.004} scale={[0.012, 0.01, 0.012]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#5b7f45" roughness={0.8} /></mesh>
        <Bloom color={color} kind={kind} />
      </group>
    </group>
  )
}

export function Flowers(props) {
  const vase = useMemo(vaseGeometry, [])
  return (
    <group name="flowers" {...props}>
      <mesh name="flower vase" geometry={vase} castShadow receiveShadow>
        <meshStandardMaterial color="#9fb3a0" roughness={0.28} metalness={0.02} />
      </mesh>
      {STEMS.map((s, i) => <Stem key={i} i={i} {...s} />)}
    </group>
  )
}
