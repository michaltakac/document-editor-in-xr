// Google Drive, read-only, straight from the browser.
//
// The app asks Google for an access token with Google Identity Services (no server, no secret) and
// then talks to the Drive v3 REST API. Set the OAuth client id to switch the explorer from the
// bundled sample library to the real thing:
//
//     VITE_GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com   (.env, or the published app's env)
//
// The client id must be a "Web application" one whose authorised JavaScript origin is where the app
// is served from, and the Drive API must be enabled for its project. Scope: drive.readonly.
//
// Every person in the room signs in for themselves — a token never travels through shared state.
// What *is* shared is which folder the room browses and which document is open (see Reader.jsx).

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const API = 'https://www.googleapis.com/drive/v3'

export const driveConfigured = !!CLIENT_ID

let token = null // { value, expiresAt }

function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis]')
    if (existing) { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('Google sign-in script blocked'))); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.dataset.gis = '1'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Google sign-in script blocked'))
    document.head.appendChild(s)
  })
}

/** Ask for (or silently renew) an access token. Opens Google's consent popup the first time. */
export async function signIn({ prompt = '' } = {}) {
  if (!CLIENT_ID) throw new Error('Google Drive setup required: set VITE_GOOGLE_CLIENT_ID and authorize this app origin')
  if (token && token.expiresAt - 60_000 > Date.now()) return token.value
  await loadGis()
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      prompt,
      callback: (res) => {
        if (!res?.access_token) return reject(new Error(res?.error_description || res?.error || 'Sign-in cancelled'))
        token = { value: res.access_token, expiresAt: Date.now() + (Number(res.expires_in) || 3600) * 1000 }
        resolve(token.value)
      },
      error_callback: (err) => reject(new Error(err?.message || 'Sign-in cancelled')),
    })
    client.requestAccessToken()
  })
}

export const signedIn = () => !!token && token.expiresAt > Date.now()
export function signOut() { token = null }

async function call(path, { raw = false } = {}) {
  if (!signedIn()) throw new Error('Google Drive session expired or not connected. Disconnect and connect again on the explorer.')
  const value = token.value
  const res = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${value}` } })
  if (!res.ok) {
    if (res.status === 401) token = null
    throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0, 120)}`)
  }
  return raw ? res : res.json()
}

// ——— what a file is, for the scene ———————————————————————————————————————————————

/** One of the modes the reader can show. Everything else is 'other'. */
export function kindOf(mime = '') {
  if (mime === 'application/vnd.google-apps.folder') return 'folder'
  if (mime === 'application/vnd.google-apps.document') return 'doc'
  if (mime === 'application/vnd.google-apps.spreadsheet') return 'sheet'
  if (mime === 'application/vnd.google-apps.presentation') return 'slides'
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('text/') || mime === 'application/json') return 'text'
  return 'other'
}

export const KIND = {
  folder: { tag: 'FLD', color: '#ffb347' },
  doc: { tag: 'DOC', color: '#4cb8ff' },
  sheet: { tag: 'SHT', color: '#8bd450' },
  slides: { tag: 'SLD', color: '#ffc947' },
  pdf: { tag: 'PDF', color: '#ff6b57' },
  image: { tag: 'IMG', color: '#8f8cff' },
  audio: { tag: 'AUD', color: '#3ec6a8' },
  video: { tag: 'VID', color: '#ff78c8' },
  text: { tag: 'TXT', color: '#aab3c5' },
  other: { tag: 'FILE', color: '#8a93a5' },
}

const FIELDS = 'files(id,name,mimeType,modifiedTime,size,webViewLink,videoMediaMetadata(durationMillis))'

/** The folders and files directly inside `folderId` ('root' is My Drive), folders first. */
export async function listFolder(folderId = 'root') {
  const parent = folderId.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  const q = encodeURIComponent(`'${parent}' in parents and trashed = false`)
  const files = []
  let pageToken = ''
  do {
    const data = await call(`/files?q=${q}&pageSize=100&orderBy=folder,name&fields=${encodeURIComponent(`nextPageToken,${FIELDS}`)}&supportsAllDrives=true&includeItemsFromAllDrives=true${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`)
    files.push(...(data.files ?? []))
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    kind: kindOf(f.mimeType),
    mime: f.mimeType,
    modified: f.modifiedTime?.slice(0, 10) ?? '',
    size: Number(f.size) || 0,
    link: f.webViewLink,
    duration: Number(f.videoMediaMetadata?.durationMillis) / 1000 || 0,
  }))
}

const EXPORT = { doc: 'text/plain', sheet: 'text/csv', slides: 'text/plain' }

/** Parse a CSV the way Drive exports one (quoted cells, embedded commas). */
export function parseCsv(csv) {
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (quoted) {
      if (c === '"' && csv[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = '' }
    else if (c !== '\r') cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((v) => v.trim()))
}

/**
 * Everything the reader needs for one file, by modality:
 * `{ kind, name, text }` | `{ kind, rows }` | `{ kind, slides }` | `{ kind, url }` (image/audio/video) |
 * `{ kind, note }` for a format we cannot open in the headset.
 */
export async function fetchDocument(file) {
  const exportAs = EXPORT[file.kind]
  if (exportAs) {
    const res = await call(`/files/${file.id}/export?mimeType=${encodeURIComponent(exportAs)}`, { raw: true })
    const body = await res.text()
    if (file.kind === 'sheet') return { kind: 'sheet', name: file.name, rows: parseCsv(body) }
    if (file.kind === 'slides') return { kind: 'slides', name: file.name, slides: slidesFromText(body) }
    return { kind: 'doc', name: file.name, text: body }
  }
  if (file.kind === 'text') {
    const res = await call(`/files/${file.id}?alt=media`, { raw: true })
    return { kind: 'doc', name: file.name, text: await res.text() }
  }
  if (file.kind === 'image' || file.kind === 'audio' || file.kind === 'video') {
    const res = await call(`/files/${file.id}?alt=media`, { raw: true })
    return { kind: file.kind, name: file.name, url: URL.createObjectURL(await res.blob()), duration: file.duration }
  }
  // A PDF needs a PDF engine this app does not carry; show what Drive knows and a way out.
  return { kind: 'other', name: file.name, note: `${file.mime}\n${file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}\nThis format opens in Drive, not in the headset.`, link: file.link }
}

/** Slides exported as plain text come as blocks separated by blank lines: first line title, rest bullets. */
export function slidesFromText(text) {
  return text.split(/\n\s*\n/).map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length)
    .map((lines) => ({ title: lines[0], bullets: lines.slice(1) }))
}
