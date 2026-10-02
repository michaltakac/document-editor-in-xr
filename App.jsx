// A room several people share: everyone who opens it sees each other as avatars, can pick up the objects
// on the table and press the board on the wall. Shared state and presence go through the kit in
// components/Multiplayer.jsx (read MULTIPLAYER.md). Works on a flat screen with the mouse and in a headset.
import { useEffect, useRef, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { NeutralToneMapping } from 'three'
import { XR, XROrigin, PointerEvents, createXRStore, noEvents } from '@react-three/xr'
import { Multiplayer, useMultiplayer } from './components/Multiplayer'
import { Hand, Controller } from './components/Hands'
import { Room } from './components/Room'
import { SharedObjects } from './components/SharedObjects'
import { Board } from './components/Board'
import { SPAWNS, pickSpawn } from './lib/spawn'
import './App.css'

// Hands first, controllers as a fallback; both get the same pointers (ray, grab, and poke for hands).
const store = createXRStore({ emulate: false, hand: Hand, controller: Controller })

export default function App() {
  return (
    <>
      <button className="enter-xr" onClick={() => store.enterVR()}>Enter VR</button>
      {/* noEvents + <PointerEvents />: the mouse goes through the same pointer events as hands and controllers. */}
      <Canvas shadows events={noEvents} gl={{ toneMapping: NeutralToneMapping }} camera={{ position: [0, 1.6, 0.15], fov: 60, near: 0.05, far: 60 }}>
        <PointerEvents />
        <XR store={store}>
          <Multiplayer>
            <Room />
            <Placement />
            <SharedObjects />
            <Board />
          </Multiplayer>
        </XR>
      </Canvas>
    </>
  )
}

/** Each person stands at a different place around the table; the flat-screen camera and the XR origin both go there. */
function Placement() {
  const { peers, synced, mp } = useMultiplayer()
  const [slot, setSlot] = useState(0)
  const camera = useThree((s) => s.camera)
  const decided = useRef(false)
  useEffect(() => {
    // Once the room has told us who is here, take a free place and tell the others; after that stay put.
    if (decided.current || !(synced || mp.offline)) return
    const t = setTimeout(() => { decided.current = true; const s = pickSpawn(peers); setSlot(s); mp.setFields({ spawn: s }) }, 400)
    return () => clearTimeout(t)
  }, [synced, peers, mp])
  const { position, yaw } = SPAWNS[slot]
  useEffect(() => {
    if (store.getState().session) return // in XR the origin below places us
    camera.position.set(position[0], 1.6, position[2])
    camera.rotation.set(-0.3, yaw, 0, 'YXZ')
  }, [camera, position, yaw])
  return <XROrigin position={position} rotation-y={yaw} />
}
