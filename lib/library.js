// One source of files for the scene, whichever drive it comes from: the real Google Drive once this
// person has connected (lib/drive.js), the bundled library otherwise (lib/sample-drive.js).
// Connecting is per person — the room shares *which* folder and document, never a token.
import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { driveConfigured, fetchDocument, listFolder, signIn, signOut } from './drive'
import { SAMPLE_FOLDERS, sampleDocument, sampleFolder, sampleIds } from './sample-drive'

export const useDrive = create((set, get) => ({
  available: driveConfigured,
  connected: false,
  connecting: false,
  error: null,
  connect: async () => {
    if (get().connecting) return
    set({ connecting: true, error: null })
    try { await signIn({ prompt: 'consent' }); set({ connected: true, connecting: false }) }
    catch (e) { set({ connecting: false, connected: false, error: String(e?.message ?? e) }) }
  },
  disconnect: () => { signOut(); set({ connected: false, error: null }) },
}))

const fromSample = (id) => SAMPLE_FOLDERS.includes(id) || sampleIds().includes(id)

/** The folders and files inside `folderId`: `{ loading, files, error }`. */
export function useLibrary(folderId = 'root') {
  const connected = useDrive((s) => s.connected)
  const [state, setState] = useState({ loading: true, files: [], error: null })
  useEffect(() => {
    if (fromSample(folderId)) { setState({ loading: false, files: sampleFolder(folderId), error: null }); return }
    if (!connected) { setState({ loading: false, files: [], error: 'Connect Google Drive to read this folder' }); return }
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    listFolder(folderId)
      .then((files) => alive && setState({ loading: false, files, error: null }))
      .catch((e) => alive && setState({ loading: false, files: [], error: String(e?.message ?? e) }))
    return () => { alive = false }
  }, [folderId, connected])
  return state
}

/** The content of one file, laid out by modality: `{ loading, doc, error }` (see fetchDocument). */
export function useDocument(file) {
  const connected = useDrive((s) => s.connected)
  const [state, setState] = useState({ loading: false, doc: null, error: null })
  const id = file?.id
  useEffect(() => {
    if (!file) { setState({ loading: false, doc: null, error: null }); return }
    if (fromSample(id)) { setState({ loading: false, doc: sampleDocument(file), error: null }); return }
    if (!connected) { setState({ loading: false, doc: null, error: 'Connect Google Drive on the explorer to read this file' }); return }
    let alive = true, created = null
    setState({ loading: true, doc: null, error: null })
    fetchDocument(file)
      .then((doc) => {
        if (!alive) { if (doc.url) URL.revokeObjectURL(doc.url); return }
        created = doc.url ?? null
        setState({ loading: false, doc, error: null })
      })
      .catch((e) => alive && setState({ loading: false, doc: null, error: String(e?.message ?? e) }))
    return () => { alive = false; if (created) URL.revokeObjectURL(created) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, file?.kind, connected])
  return state
}
