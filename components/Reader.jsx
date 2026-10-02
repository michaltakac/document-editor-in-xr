// The reader: one panel the whole room reads from.
//
// Shared state, written only when someone presses something: `open` (which file), `page` (which page),
// `reader` (where the panel floats, how big it is, and who is moving it) and `transport` (a recording's
// play state as "playing since t0, from offset" — never a stream of positions). While a person drags
// the panel its pose travels through their presence (mp.hold), exactly like a grabbed object.
//
// Each modality gets its own layout: a document becomes paper pages of wrapped text, a spreadsheet a
// striped table, a deck one slide per page, a photograph fills the page, a recording becomes a
// transport everybody's playhead follows.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Quaternion, SRGBColorSpace, TextureLoader, Vector3, VideoTexture } from 'three'
import { Label } from './Label'
import { Chip } from './DriveExplorer'
import { useMp, useMultiplayer, usePresence, useShared } from './Multiplayer'
import { useDocument } from '../lib/library'
import { KIND } from '../lib/drive'
import { PAGE, buildPages, pageTexture, paintedTexture } from '../lib/page'
import { ease, pulse } from '../lib/interaction'

const FRAME = { w: PAGE.w + 0.08, h: PAGE.h + 0.32 }
// where the panel floats until someone moves it: left of the wall, turned a little towards the table
const REST = { p: [-1.95, 1.5, -2.6], q: [0, 0.3429, 0, 0.9394], scale: 1, owner: null }
const TEXT_PAGES = ['text', 'rows', 'slide', 'note']

const _p = new Vector3(), _q = new Quaternion(), _offset = new Vector3()

export function Reader() {
  const [open, setOpen] = useShared('open', null)
  const [page, setPage] = useShared('page', 0)
  const [pose, setPose] = useShared('reader', REST)
  const [, setFields] = usePresence()
  const { peers } = useMultiplayer()
  const mp = useMp()
  const camera = useThree((s) => s.camera)
  const group = useRef()
  const drag = useRef(null)

  const { doc, loading, error } = useDocument(open)
  const pages = useMemo(() => buildPages(doc), [doc])
  const total = Math.max(1, pages.length)
  const index = Math.min(Math.max(0, page ?? 0), total - 1)
  const current = pages[index]

  // Tell the others which file I have open, so the explorer can mark its card with my colour.
  useEffect(() => { setFields({ viewing: open?.id ?? null }) }, [open?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const rest = pose ?? REST
  const ownerHere = rest.owner && rest.owner !== mp.me.id && peers.some((p) => p.id === rest.owner)
  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    if (drag.current) { mp.hold('reader', g.position, g.quaternion); return } // I am moving it
    if (ownerHere && mp.peerHeld(rest.owner, _p, _q) === 'reader') { // someone else is
      g.position.lerp(_p, 1 - Math.exp(-25 * delta))
      g.quaternion.slerp(_q, 1 - Math.exp(-25 * delta))
      return
    }
    const p = rest.p ?? REST.p, q = rest.q ?? REST.q
    g.position.x = ease(g.position.x, p[0], delta)
    g.position.y = ease(g.position.y, p[1], delta)
    g.position.z = ease(g.position.z, p[2], delta)
    _q.set(q[0], q[1], q[2], q[3])
    g.quaternion.slerp(_q, 1 - Math.exp(-18 * delta))
  })

  const writePose = (patch) => setPose({ ...rest, ...patch })
  const take = (e) => {
    if (ownerHere || drag.current) return
    e.stopPropagation()
    e.target.setPointerCapture(e.pointerId)
    drag.current = e.pointerId
    _offset.copy(group.current.position).sub(e.point)
    writePose({ owner: mp.me.id })
    pulse(e, 0.6, 20)
  }
  const move = (e) => {
    if (drag.current !== e.pointerId) return
    const g = group.current
    g.position.copy(e.point).add(_offset)
    g.position.y = Math.max(0.9, g.position.y)
  }
  const drop = (e) => {
    if (drag.current !== e.pointerId) return
    drag.current = null
    const g = group.current
    setPose({ ...rest, p: g.position.toArray().map((v) => +v.toFixed(3)), q: g.quaternion.toArray().map((v) => +v.toFixed(3)), owner: null })
    mp.release()
  }
  /** Turn the panel towards whoever presses it (the mover's camera), without moving it. */
  const faceMe = () => {
    const g = group.current
    const yaw = Math.atan2(camera.position.x - g.position.x, camera.position.z - g.position.z)
    writePose({ q: [0, +Math.sin(yaw / 2).toFixed(3), 0, +Math.cos(yaw / 2).toFixed(3)] })
  }
  const scale = rest.scale ?? 1
  const head = doc ? `${doc.name}  ·  page ${index + 1} of ${total}` : ''

  return (
    <group ref={group} name={open ? `reader ${open.name}` : 'reader'} position={rest.p ?? REST.p} quaternion={rest.q ?? REST.q} scale={scale}>
      <mesh name="reader frame" castShadow>
        <boxGeometry args={[FRAME.w, FRAME.h, 0.04]} />
        <meshStandardMaterial color="#1b2030" roughness={0.6} />
      </mesh>

      {/* title row */}
      <Label text={open ? open.name : 'Nothing open'} name="reader title" size={0.055} weight={700} width={0.9} position={[-0.17, FRAME.h / 2 - 0.08, 0.025]} />
      {open && <Label text={(KIND[open.kind] ?? KIND.other).tag} size={0.04} weight={700} color={(KIND[open.kind] ?? KIND.other).color} position={[-FRAME.w / 2 + 0.07, FRAME.h / 2 - 0.08, 0.025]} />}
      {open && <Chip name="close" label="✕" width={0.12} height={0.1} position={[FRAME.w / 2 - 0.09, FRAME.h / 2 - 0.08, 0.025]} onPress={() => { setOpen(null); setPage(0) }} />}

      {/* the page */}
      <group position={[0, 0, 0.025]}>
        {!open && <Label text="Pick a document from the wall" size={0.06} color="#95a0b5" width={1.1} />}
        {open && loading && <Label text="Loading from Drive…" size={0.06} color="#95a0b5" />}
        {open && error && <Label text={error} size={0.04} color="#ff9c8a" width={1.2} />}
        {doc && current && TEXT_PAGES.includes(current.type) && <TextPage page={current} head={head} index={index} total={total} />}
        {doc && current?.type === 'image' && <ImagePage doc={doc} />}
        {doc && current?.type === 'media' && <MediaPage doc={doc} />}
      </group>

      {/* page turning and size */}
      <group position={[0, -FRAME.h / 2 + 0.09, 0.025]}>
        {total > 1 && <Chip name="prev page" label="◀ Back" width={0.3} height={0.1} position={[-0.42, 0, 0]} onPress={() => setPage(Math.max(0, index - 1))} />}
        {total > 1 && <Label text={`${index + 1} / ${total}`} name="page number" size={0.045} weight={600} position={[-0.17, 0, 0]} />}
        {total > 1 && <Chip name="next page" label="Next ▶" width={0.3} height={0.1} position={[0.08, 0, 0]} onPress={() => setPage(Math.min(total - 1, index + 1))} />}
        {/* the three on the right are narrow so they do not run into each other */}
        <Chip name="face me" label="Face me" width={0.12} height={0.1} labelWidth={0.1} position={[0.42, 0, 0]} onPress={faceMe} />
        <Chip name="smaller" label="−" width={0.06} height={0.1} labelWidth={0.05} position={[FRAME.w / 2 - 0.17, 0, 0]} onPress={() => writePose({ scale: +Math.max(0.6, scale - 0.2).toFixed(2) })} />
        <Chip name="bigger" label="+" width={0.06} height={0.1} labelWidth={0.05} position={[FRAME.w / 2 - 0.06, 0, 0]} onPress={() => writePose({ scale: +Math.min(1.8, scale + 0.2).toFixed(2) })} />
      </group>

      {/* the bar you take the panel by */}
      <mesh name="reader handle" position={[0, -FRAME.h / 2 - 0.05, 0]} castShadow
        onPointerDown={take} onPointerMove={move} onPointerUp={drop} onPointerCancel={drop}>
        <boxGeometry args={[0.5, 0.06, 0.06]} />
        <meshStandardMaterial color={drag.current ? '#4cb8ff' : ownerHere ? '#6f7b91' : '#2f3747'} roughness={0.5} emissive="#4cb8ff" emissiveIntensity={ownerHere ? 0.3 : 0} />
      </mesh>
    </group>
  )
}

function TextPage({ page, head }) {
  const texture = useMemo(() => pageTexture(page, head), [page, head])
  useEffect(() => () => texture.dispose(), [texture])
  return (
    <mesh name={`page ${head}`}>
      <planeGeometry args={[PAGE.w, PAGE.h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  )
}

/** A photograph: painted here for the sample library, loaded from the Drive blob otherwise. */
function ImagePage({ doc }) {
  const [texture, setTexture] = useState(null)
  useEffect(() => {
    if (doc.paint) { const t = paintedTexture(doc.paint); setTexture(t); return () => t.dispose() }
    if (!doc.url) return
    let made
    new TextureLoader().load(doc.url, (t) => { t.colorSpace = SRGBColorSpace; made = t; setTexture(t) })
    return () => made?.dispose()
  }, [doc])
  const aspect = texture ? texture.image.width / texture.image.height : PAGE.w / PAGE.h
  const w = Math.min(PAGE.w, PAGE.h * aspect), h = w / aspect
  return texture ? (
    <mesh name={`image ${doc.name}`}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={texture} toneMapped={false} />
    </mesh>
  ) : <Label text="Loading image…" size={0.05} color="#95a0b5" />
}

/**
 * A recording. The transport is shared as `{ playing, at, since }`: everyone works out the playhead
 * from their own clock, so one press of play starts the whole room from the same place and not one
 * message per frame is sent.
 */
function MediaPage({ doc }) {
  const [transport, setTransport] = useShared('transport', { playing: false, at: 0, since: 0 })
  const duration = Math.max(1, doc.duration || 60)
  const bar = useRef()
  const [clock, setClock] = useState(0)
  const t = useRef(0)
  const media = useRef(null)
  const [videoTexture, setVideoTexture] = useState(null)

  const now = () => {
    const tr = transport ?? { playing: false, at: 0, since: 0 }
    const value = tr.playing ? tr.at + (Date.now() - tr.since) / 1000 : tr.at
    return Math.min(duration, Math.max(0, value))
  }

  // A real file from Drive plays through a media element; the sample recording is a timeline only.
  useEffect(() => {
    if (!doc.url) return
    const el = document.createElement(doc.kind === 'video' ? 'video' : 'audio')
    el.src = doc.url
    el.crossOrigin = 'anonymous'
    el.playsInline = true
    media.current = el
    if (doc.kind === 'video') { const vt = new VideoTexture(el); vt.colorSpace = SRGBColorSpace; setVideoTexture(vt) }
    return () => { el.pause(); media.current = null; setVideoTexture(null) }
  }, [doc])

  useEffect(() => {
    const el = media.current
    if (!el) return
    el.currentTime = now()
    if (transport?.playing) el.play().catch(() => {})
    else el.pause()
  }, [transport?.playing, transport?.since, transport?.at]) // eslint-disable-line react-hooks/exhaustive-deps

  // the playhead moves every frame locally; the clock label only four times a second
  useFrame(() => {
    t.current = now()
    if (bar.current) {
      const f = t.current / duration
      bar.current.scale.x = Math.max(0.001, f)
      bar.current.position.x = -0.5 + f / 2
    }
  })
  useEffect(() => {
    const id = setInterval(() => setClock(Math.floor(now())), 250)
    return () => clearInterval(id)
  }, [transport]) // eslint-disable-line react-hooks/exhaustive-deps

  const playing = !!transport?.playing
  const toggle = () => setTransport(playing ? { playing: false, at: +now().toFixed(2), since: 0 } : { playing: true, at: +now().toFixed(2), since: Date.now() })
  const seek = (by) => {
    const at = +Math.min(duration, Math.max(0, now() + by)).toFixed(2)
    setTransport(playing ? { playing: true, at, since: Date.now() } : { playing: false, at, since: 0 })
  }
  const time = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <group>
      {videoTexture ? (
        <mesh name={`video ${doc.name}`} position-y={0.08}>
          <planeGeometry args={[PAGE.w, PAGE.w * 0.5625]} />
          <meshBasicMaterial map={videoTexture} toneMapped={false} />
        </mesh>
      ) : (
        <group position-y={0.14}>
          <mesh name="media stage">
            <planeGeometry args={[PAGE.w, 0.42]} />
            <meshBasicMaterial color="#101622" toneMapped={false} />
          </mesh>
          {/* a painted waveform: a still picture of the recording, not an animation */}
          {Array.from({ length: 64 }, (_, i) => {
            const h = 0.04 + Math.abs(Math.sin(i * 0.7) * Math.sin(i * 0.13 + 1)) * 0.3
            return (
              <mesh key={i} name="waveform bar" position={[-PAGE.w / 2 + 0.03 + i * (PAGE.w - 0.06) / 63, 0, 0.001]}>
                <planeGeometry args={[0.008, h]} />
                <meshBasicMaterial color={playing ? '#4cb8ff' : '#39445c'} toneMapped={false} />
              </mesh>
            )
          })}
        </group>
      )}

      <Label text={doc.name} size={0.05} weight={600} width={1.1} position={[0, -0.14, 0]} />
      <Label text={`${time(clock)} / ${time(duration)}${playing ? '  ▸ playing for everyone' : ''}`} size={0.04} color="#95a0b5" position={[0, -0.22, 0]} />

      <mesh name="playhead track" position={[0, -0.3, 0]}>
        <planeGeometry args={[1, 0.012]} />
        <meshBasicMaterial color="#39445c" toneMapped={false} />
      </mesh>
      <mesh ref={bar} name="playhead" position={[-0.5, -0.3, 0.001]} scale-x={0.001}>
        <planeGeometry args={[1, 0.012]} />
        <meshBasicMaterial color="#4cb8ff" toneMapped={false} />
      </mesh>

      <group position={[0, -0.38, 0]}>
        <Chip name="back 10s" label="−10s" width={0.22} height={0.09} position={[-0.3, 0, 0]} onPress={() => seek(-10)} />
        <Chip name="play" label={playing ? '❙❙ Pause' : '▶ Play'} width={0.3} height={0.09} color={playing ? '#2a5f8f' : '#2f3747'} onPress={toggle} />
        <Chip name="forward 10s" label="+10s" width={0.22} height={0.09} position={[0.3, 0, 0]} onPress={() => seek(10)} />
      </group>
    </group>
  )
}
