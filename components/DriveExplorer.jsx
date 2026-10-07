// The drive on the wall: one card per folder and file, twelve at a time. Which folder the room is in
// and which card is open are shared state (`folder`, `shelf`, `open`), so walking into a folder takes
// everyone with you. Who is reading what travels as presence (`viewing`), drawn as a dot in that
// person's colour on the card they have open.
import { useEffect } from 'react'
import { Label } from './Label'
import { usePress } from '../lib/interaction'
import { useMultiplayer, useShared } from './Multiplayer'
import { KIND } from '../lib/drive'
import { SAMPLE_FOLDERS, SAMPLE_ROOT } from '../lib/sample-drive'
import { useDrive, useLibrary } from '../lib/library'

const PANEL = '#1b2030'
const PER_SHELF = 12
const COLS = [-1.05, -0.35, 0.35, 1.05]
const ROWS = [0.42, 0.0, -0.42]
const DRIVE_ROOT = { id: 'root', name: 'My Drive', trail: [] }

export function DriveExplorer({ position = [0, 1.45, -4.32] }) {
  const [folder, setFolder] = useShared('folder', SAMPLE_ROOT)
  const [shelf, setShelf] = useShared('shelf', 0)
  const [open, setOpen] = useShared('open', null)
  const [, setPage] = useShared('page', 0)
  const { peers } = useMultiplayer()
  const drive = useDrive()
  const here = folder ?? SAMPLE_ROOT
  const { files, loading, error } = useLibrary(here.id)

  // Connecting a real Drive moves the room out of the sample library and into My Drive.
  useEffect(() => {
    if (drive.connected && SAMPLE_FOLDERS.includes(here.id)) {
      setFolder(DRIVE_ROOT)
      setShelf(0)
      setOpen(null)
      setPage(0)
    }
  }, [drive.connected]) // eslint-disable-line react-hooks/exhaustive-deps

  const shelves = Math.max(1, Math.ceil(files.length / PER_SHELF))
  const index = Math.min(Math.max(0, shelf ?? 0), shelves - 1)
  const shown = files.slice(index * PER_SHELF, index * PER_SHELF + PER_SHELF)
  const needsConnect = !drive.connected && !SAMPLE_FOLDERS.includes(here.id)

  const press = (file) => {
    if (file.kind === 'folder') {
      setFolder({ id: file.id, name: file.name, trail: [...(here.trail ?? []), { id: here.id, name: here.name }] })
      setShelf(0)
      return
    }
    setOpen({ id: file.id, name: file.name, kind: file.kind, mime: file.mime ?? '', size: file.size ?? 0, duration: file.duration ?? 0, link: file.link ?? '' })
    setPage(0)
  }
  const up = () => {
    const trail = [...(here.trail ?? [])]
    const parent = trail.pop()
    if (!parent) return
    setFolder({ ...parent, trail })
    setShelf(0)
  }

  const path = [...(here.trail ?? []).map((t) => t.name), here.name].join('  ›  ')
  const source = drive.connected ? 'Google Drive · read-only' : drive.available ? 'Sample library · not connected' : 'Sample library · set VITE_GOOGLE_CLIENT_ID for Drive'
  const connectionError = drive.error || error
  const status = connectionError ? connectionError : drive.connecting ? 'Connecting to Google Drive…' : loading ? 'Loading…' : needsConnect ? 'Connect your Drive to see this folder' : files.length === 0 ? 'This folder is empty' : ''

  return (
    <group name="drive explorer" position={position}>
      <mesh name="explorer back" receiveShadow>
        <boxGeometry args={[3.04, 1.94, 0.05]} />
        <meshStandardMaterial color={PANEL} roughness={0.65} />
      </mesh>

      <Label text={path} name="explorer path" size={0.07} weight={700} width={1.7} position={[-0.42, 0.8, 0.03]} />
      <Label text={status || source} name="explorer status" size={0.038} color={connectionError ? '#ff9c8a' : '#95a0b5'} width={1.7} position={[-0.42, 0.7, 0.03]} />

      {(here.trail ?? []).length > 0 && <Chip label="▲ Up" width={0.34} position={[-1.3, 0.8, 0.03]} onPress={up} />}
      <Chip
        name="connect"
        label={drive.connected ? 'Disconnect' : drive.connecting ? 'Signing in…' : 'Connect Google Drive'}
        width={drive.connected ? 0.52 : 0.84}
        color={drive.connected ? '#2f3747' : '#2a5f8f'}
        position={[1.08, 0.8, 0.03]}
        onPress={() => (drive.connected ? drive.disconnect() : drive.connect())}
      />

      {shown.map((file, i) => (
        <Card
          key={file.id}
          file={file}
          open={open?.id === file.id}
          readers={peers.filter((p) => p.fields?.viewing === file.id)}
          position={[COLS[i % 4], ROWS[Math.floor(i / 4)], 0.03]}
          onPress={() => press(file)}
        />
      ))}

      {shelves > 1 && (
        <>
          <Chip label="◀" width={0.2} position={[-0.42, -0.78, 0.03]} onPress={() => setShelf(Math.max(0, index - 1))} />
          <Label text={`${index * PER_SHELF + 1}–${index * PER_SHELF + shown.length} of ${files.length}`} size={0.04} color="#95a0b5" position={[0, -0.78, 0.03]} />
          <Chip label="▶" width={0.2} position={[0.42, -0.78, 0.03]} onPress={() => setShelf(Math.min(shelves - 1, index + 1))} />
        </>
      )}
      {shelves <= 1 && files.length > 0 && <Label text={`${files.length} item${files.length === 1 ? '' : 's'}`} size={0.04} color="#95a0b5" position={[0, -0.78, 0.03]} />}

      {/* who is here and what they have open */}
      <Label
        text={peers.length ? peers.map((p) => `${p.name}${p.fields?.viewing ? ' ✦' : ''}`).join('   ') : 'you are alone in this room'}
        size={0.035} color="#6f7b91" width={2.6} position={[0, -0.9, 0.03]}
      />
    </group>
  )
}

/** One file or folder. Pressing a folder walks into it; pressing a file opens it in the reader. */
function Card({ file, open, readers, position, onPress }) {
  const { hovered, pressed, handlers } = usePress({ onPress })
  const kind = KIND[file.kind] ?? KIND.other
  const w = 0.64, h = 0.38
  return (
    <group name={`card ${file.name}`} position={position} {...handlers}>
      <mesh position-z={pressed ? 0.004 : open ? 0.022 : 0.012} castShadow>
        <boxGeometry args={[w, h, 0.03]} />
        <meshStandardMaterial
          color={open ? '#39445c' : hovered ? '#2e3749' : '#242c3c'}
          roughness={0.5} emissive={kind.color} emissiveIntensity={open ? 0.4 : hovered ? 0.14 : 0.04}
        />
      </mesh>
      <group position-z={pressed ? 0.02 : open ? 0.038 : 0.028}>
        {/* the kind, as a colour patch with its three letters */}
        <mesh name={`kind ${kind.tag}`} position={[-w / 2 + 0.11, h / 2 - 0.1, 0]}>
          <planeGeometry args={[0.15, 0.1]} />
          <meshBasicMaterial color={kind.color} toneMapped={false} />
        </mesh>
        <Label text={kind.tag} size={0.045} weight={700} color="#141a26" position={[-w / 2 + 0.11, h / 2 - 0.1, 0.001]} />
        <Label text={file.name} size={0.046} weight={600} width={w - 0.04} position={[0, -0.01, 0]} />
        <Label text={file.modified || ''} size={0.032} color="#8d98ad" position={[0, -0.11, 0]} />
        {readers.map((p, i) => (
          <mesh key={p.id} name={`reader dot ${p.name}`} position={[w / 2 - 0.05 - i * 0.055, h / 2 - 0.06, 0]}>
            <circleGeometry args={[0.022, 20]} />
            <meshBasicMaterial color={p.color} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** A small labelled button. `labelWidth` lets a narrow chip keep readable text that spills over it. */
export function Chip({ label, name, onPress, width = 0.4, height = 0.12, labelWidth, color = '#2f3747', position }) {
  const { hovered, pressed, handlers } = usePress({ onPress })
  return (
    <group position={position} {...handlers}>
      <mesh name={`chip ${name ?? label}`} position-z={pressed ? 0.004 : 0.016} castShadow>
        <boxGeometry args={[width, height, 0.028]} />
        <meshStandardMaterial color={hovered ? '#3d4758' : color} roughness={0.5} emissive="#4cb8ff" emissiveIntensity={pressed ? 0.6 : hovered ? 0.18 : 0} />
      </mesh>
      <Label text={label} size={0.05} weight={600} width={labelWidth ?? width - 0.05} position-z={pressed ? 0.022 : 0.034} />
    </group>
  )
}
