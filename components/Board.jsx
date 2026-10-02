// A board on the back wall that everyone sees the same: a counter with − and + buttons, and eight
// colour tiles that toggle. Both live in the room's shared state (useShared), so a press by anyone
// shows up for all — the quickest way for two people to see that they are in the same place.
import { Label } from './Label'
import { usePress } from '../lib/interaction'
import { useShared, useMultiplayer } from './Multiplayer'

const PANEL = '#1f2430'
const TILE_COLORS = ['#ff6b57', '#ffb347', '#ffe066', '#8bd450', '#3ec6a8', '#4cb8ff', '#8f8cff', '#ff78c8']

export function Board({ position = [0, 1.45, -4.35] }) {
  const [count, setCount] = useShared('count', 0)
  const [tiles, setTiles] = useShared('tiles', [false, false, false, false, false, false, false, false])
  const { peers, connected } = useMultiplayer()
  const toggle = (i) => setTiles((t) => { const next = [...(t ?? [])]; next[i] = !next[i]; return next })
  return (
    <group name="board" position={position}>
      <mesh name="board back" receiveShadow>
        <boxGeometry args={[1.9, 1.15, 0.05]} />
        <meshStandardMaterial color={PANEL} roughness={0.6} />
      </mesh>
      <Label text="Shared board" size={0.07} weight={600} position={[0, 0.44, 0.03]} />
      <Label text={connected ? `${peers.length + 1} here` : 'single-user (no relay)'} size={0.035} color="#aab3c5" position={[0, 0.355, 0.03]} />

      <Button label="−" position={[-0.42, 0.1, 0.03]} onPress={() => setCount((c) => (c ?? 0) - 1)} />
      <Label text={count} name="counter" size={0.18} weight={700} position={[0, 0.1, 0.03]} width={0.5} />
      <Button label="+" position={[0.42, 0.1, 0.03]} onPress={() => setCount((c) => (c ?? 0) + 1)} />

      {TILE_COLORS.map((c, i) => <Tile key={i} index={i} color={c} on={!!tiles?.[i]} position={[-0.7 + i * 0.2, -0.3, 0.03]} onPress={() => toggle(i)} />)}
    </group>
  )
}

export function Button({ label, onPress, size = 0.16, color = '#2f3747', position }) {
  const { hovered, pressed, handlers } = usePress({ onPress })
  return (
    <group position={position} {...handlers}>
      <mesh name={`button ${label}`} position-z={pressed ? 0.005 : 0.02} castShadow>
        <boxGeometry args={[size, size, 0.04]} />
        <meshStandardMaterial color={hovered ? '#3d4758' : color} roughness={0.5} emissive="#4cb8ff" emissiveIntensity={pressed ? 0.6 : hovered ? 0.15 : 0} />
      </mesh>
      <Label text={label} size={0.1} weight={700} position-z={pressed ? 0.03 : 0.045} />
    </group>
  )
}

function Tile({ index, color, on, position, onPress }) {
  const { hovered, pressed, handlers } = usePress({ onPress })
  return (
    <mesh name={`tile ${index}`} position={position} position-z={pressed ? 0.01 : 0.025} castShadow {...handlers}>
      <boxGeometry args={[0.16, 0.16, 0.05]} />
      <meshStandardMaterial color={on ? color : '#343c4c'} emissive={color} emissiveIntensity={on ? 0.7 : hovered ? 0.15 : 0} roughness={0.4} />
    </mesh>
  )
}
