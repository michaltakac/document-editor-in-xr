// A reading room several people share. The wall is a Google Drive folder, one card per file; the panel
// floating over the table is the reader, and everyone in the room sees the same document on the same
// page. Documents, spreadsheets, decks, photographs and recordings each get their own layout
// (components/Reader.jsx); the drive itself comes from lib/drive.js — a read-only Google sign-in in
// this browser, with a bundled sample library until someone connects.
// Shared state and presence go through the kit in components/Multiplayer.jsx (read MULTIPLAYER.md).
// Works on a flat screen with the mouse and in a headset.
import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { NeutralToneMapping, Vector3 } from 'three'
import { XR, XROrigin, PointerEvents, createXRStore, noEvents } from '@react-three/xr'
import { Multiplayer, useMultiplayer } from './components/Multiplayer'
import { Hand, Controller } from './components/Hands'
import { Room, ROOM } from './components/Room'
import { DriveExplorer } from './components/DriveExplorer'
import { Reader } from './components/Reader'
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
            {/* Dragging the bare room (floor, walls, table) with the mouse looks around; cards and buttons keep their presses. */}
            <Room onPointerDown={startLook} />
            <Placement />
            <DriveExplorer />
            <Reader />
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
  const origin = useRef()
  useEffect(() => {
    if (store.getState().session) return // in XR the origin below places us
    camera.position.set(position[0], 1.6, position[2])
    camera.rotation.set(-0.3, yaw, 0, 'YXZ')
  }, [camera, position, yaw])
  useEffect(() => {
    // a new place resets any walking done in XR
    origin.current?.position.set(position[0], position[1], position[2])
    origin.current?.rotation.set(0, yaw, 0)
  }, [position, yaw])
  return (
    <>
      <XROrigin ref={origin} position={position} rotation-y={yaw} />
      <KeyboardMove origin={origin} />
      <MouseLook />
    </>
  )
}

// ---- Keyboard movement: WASD / arrows walk, Q / E turn, Shift runs. On a flat screen it moves the camera;
// in XR it moves the XR origin (the kit reads the origin, so the avatar follows). Headset tracking is untouched.
const keys = new Set()
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']
const LIMIT = { x0: -ROOM.w / 2 + 0.3, x1: ROOM.w / 2 - 0.3, z0: -1.2 - ROOM.d / 2 + 0.3, z1: -1.2 + ROOM.d / 2 - 0.3 }
const fwd = new Vector3(), side = new Vector3(), step = new Vector3(), headWorld = new Vector3()

function KeyboardMove({ origin }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    const typing = (e) => e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))
    const down = (e) => {
      if (!MOVE_KEYS.includes(e.code) || typing(e) || e.ctrlKey || e.metaKey || e.altKey) return
      keys.add(e.code)
      if (e.code.startsWith('Arrow')) e.preventDefault() // no page scrolling
    }
    const up = (e) => keys.delete(e.code)
    const clear = () => keys.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear) }
  }, [])
  useFrame((_, dt) => {
    if (!keys.size) return
    dt = Math.min(dt, 0.1)
    const k = (...c) => c.some((x) => keys.has(x))
    const f = (k('KeyW', 'ArrowUp') ? 1 : 0) - (k('KeyS', 'ArrowDown') ? 1 : 0)
    const r = (k('KeyD', 'ArrowRight') ? 1 : 0) - (k('KeyA', 'ArrowLeft') ? 1 : 0)
    const turn = (k('KeyQ') ? 1 : 0) - (k('KeyE') ? 1 : 0)
    const speed = (k('ShiftLeft', 'ShiftRight') ? 3 : 1.5) * dt
    const inXR = !!store.getState().session
    const o = origin.current
    // walk along the floor in the direction the view faces
    camera.getWorldDirection(fwd); fwd.y = 0
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1)
    fwd.normalize()
    side.set(-fwd.z, 0, fwd.x)
    step.copy(fwd).multiplyScalar(f).addScaledVector(side, r)
    if (step.lengthSq() > 0) step.normalize().multiplyScalar(speed)
    const target = inXR ? o : camera
    if (!target) return
    if (inXR) {
      camera.getWorldPosition(headWorld)
      const nx = clampTo(headWorld.x + step.x, LIMIT.x0, LIMIT.x1), nz = clampTo(headWorld.z + step.z, LIMIT.z0, LIMIT.z1)
      o.position.x += nx - headWorld.x; o.position.z += nz - headWorld.z
      if (turn) {
        // turn about the head, not the origin, so the view does not swing sideways
        const a = turn * 1.6 * dt, c = Math.cos(a), s = Math.sin(a)
        const dx = o.position.x - headWorld.x - (nx - headWorld.x), dz = o.position.z - headWorld.z - (nz - headWorld.z)
        o.position.x = nx + c * dx + s * dz; o.position.z = nz - s * dx + c * dz
        o.rotation.y += a
      }
    } else {
      camera.position.x = clampTo(camera.position.x + step.x, LIMIT.x0, LIMIT.x1)
      camera.position.z = clampTo(camera.position.z + step.z, LIMIT.z0, LIMIT.z1)
      if (turn) camera.rotation.y += turn * 1.6 * dt
    }
  })
  return null
}
const clampTo = (v, a, b) => Math.min(b, Math.max(a, v))

// ---- Mouse look (flat screen only): drag the bare room with the left button, or drag anywhere with the right
// button. Cards, buttons and pages get their presses as before because they are hit before the room.
const look = { active: false }
function startLook(e) {
  if (store.getState().session) return // in XR the head turns the view
  look.active = true
}
function MouseLook() {
  const camera = useThree((s) => s.camera)
  const canvas = useThree((s) => s.gl.domElement)
  useEffect(() => {
    const down = (e) => { if (e.button === 2 && !store.getState().session) look.active = true }
    const move = (e) => {
      if (!look.active || store.getState().session) return
      if (!e.buttons) { look.active = false; return }
      camera.rotation.order = 'YXZ'
      camera.rotation.y -= e.movementX * 0.004
      camera.rotation.x = clampTo(camera.rotation.x - e.movementY * 0.004, -1.4, 1.4)
      camera.rotation.z = 0
    }
    const up = () => { look.active = false }
    const menu = (e) => e.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('contextmenu', menu)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('contextmenu', menu)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [camera, canvas])
  return null
}
