// Things on the table that anyone can pick up and move. Where an object rests lives in the Y.Map
// `objects` (shared state); while someone carries it, its pose travels through that person's presence
// (mp.hold) and the others follow it smoothly; on release the final pose is written to the map once.
// Ownership: `owner` is the holder's id. A grab is refused while someone who is still here holds it.
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Quaternion, Vector3 } from 'three'
import { useMp, useMultiplayer, useSharedMap } from './Multiplayer'
import { TABLE } from '../lib/spawn'
import { ease, pulse } from '../lib/interaction'

const STARTERS = {
  'red cube': { shape: 'cube', color: '#ff6b57', p: [TABLE.x - 0.28, TABLE.top + 0.06, TABLE.z + 0.08], q: [0, 0.2, 0, 0.98] },
  'teal sphere': { shape: 'sphere', color: '#3ec6a8', p: [TABLE.x + 0.1, TABLE.top + 0.07, TABLE.z - 0.22], q: [0, 0, 0, 1] },
  'yellow cone': { shape: 'cone', color: '#ffc947', p: [TABLE.x + 0.3, TABLE.top + 0.08, TABLE.z + 0.15], q: [0, 0, 0, 1] },
  'blue prism': { shape: 'prism', color: '#4cb8ff', p: [TABLE.x - 0.05, TABLE.top + 0.05, TABLE.z + 0.34], q: [0, 0.5, 0, 0.87] },
}
const HALF = { cube: 0.06, sphere: 0.07, cone: 0.08, prism: 0.05 }

export function SharedObjects() {
  const objects = useSharedMap('objects')
  const { synced, mp } = useMultiplayer()
  // The first person in an empty room puts the starters on the table (same values from everyone: no conflict).
  useEffect(() => {
    if ((synced || mp.offline) && objects.map.size === 0) mp.doc.transact(() => { for (const [id, o] of Object.entries(STARTERS)) objects.map.set(id, { ...o, owner: null }) })
  }, [synced, mp, objects.map])
  return Object.entries(objects.items).map(([id, o]) => <Grabbable key={id} id={id} {...o} objects={objects} />)
}

const _p = new Vector3(), _q = new Quaternion(), _offset = new Vector3()

/** One shared object. Pointer events come from the mouse, a controller ray, a pinch or a touching hand alike. */
function Grabbable({ id, shape, color, p, q, owner, objects }) {
  const mp = useMp()
  const { peers } = useMultiplayer()
  const group = useRef()
  const held = useRef(null) // { pointerId } while I carry it
  const ownerHere = owner !== null && owner !== mp.me.id && peers.some((x) => x.id === owner)
  const mine = owner === mp.me.id

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    if (held.current) { mp.hold(id, g.position, g.quaternion); return } // my hand moves it; others follow
    if (ownerHere && mp.peerHeld(owner, _p, _q) === id) { // someone else carries it: follow their smoothed pose
      g.position.lerp(_p, 1 - Math.exp(-25 * delta))
      g.quaternion.slerp(_q, 1 - Math.exp(-25 * delta))
      return
    }
    // at rest: ease to where the room says it is
    _p.set(p[0], p[1], p[2])
    _q.set(q[0], q[1], q[2], q[3])
    g.position.x = ease(g.position.x, _p.x, delta)
    g.position.y = ease(g.position.y, _p.y, delta)
    g.position.z = ease(g.position.z, _p.z, delta)
    g.quaternion.slerp(_q, 1 - Math.exp(-18 * delta))
  })

  const grab = (e) => {
    if (ownerHere || held.current) return // taken by someone who is still here
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    held.current = { pointerId: e.pointerId }
    _offset.copy(group.current.position).sub(e.point)
    objects.update(id, { owner: mp.me.id })
    pulse(e, 0.6, 20)
  }
  const move = (e) => {
    if (held.current?.pointerId !== e.pointerId) return
    group.current.position.copy(e.point).add(_offset)
  }
  const drop = (e) => {
    if (held.current?.pointerId !== e.pointerId) return
    held.current = null
    const g = group.current
    // settle: onto the table when over it, else onto the floor
    const onTable = Math.hypot(g.position.x - TABLE.x, g.position.z - TABLE.z) < TABLE.radius - 0.05
    g.position.y = (onTable ? TABLE.top : 0) + HALF[shape]
    objects.update(id, { p: [+g.position.x.toFixed(3), +g.position.y.toFixed(3), +g.position.z.toFixed(3)], q: g.quaternion.toArray().map((v) => +v.toFixed(3)), owner: null })
    mp.release()
  }

  const geometry = useMemo(() => shape === 'sphere' ? <sphereGeometry args={[0.07, 32, 24]} /> : shape === 'cone' ? <coneGeometry args={[0.07, 0.16, 32]} /> : shape === 'prism' ? <cylinderGeometry args={[0.07, 0.07, 0.1, 3]} /> : <boxGeometry args={[0.12, 0.12, 0.12]} />, [shape])
  const busy = ownerHere
  return (
    <group ref={group} position={p} quaternion={q} name={id}
      onPointerDown={grab} onPointerMove={move} onPointerUp={drop} onPointerCancel={drop}>
      <mesh castShadow receiveShadow>
        {geometry}
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.1} emissive={color} emissiveIntensity={mine ? 0.35 : busy ? 0.12 : 0} transparent opacity={busy ? 0.75 : 1} />
      </mesh>
    </group>
  )
}
