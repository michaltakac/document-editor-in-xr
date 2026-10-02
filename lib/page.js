// A document turned into pages, and a page turned into a texture.
//
// The reader panel is one plane 1.28 m wide; the canvas behind it is 1280 × 880, i.e. exactly 1000
// pixels per metre, so a 26 px line of text is 26 mm tall in the room — comfortable at arm's length
// and still readable from across the table. Pages are built once per document (useMemo in Reader)
// and a texture is made once per page.
import { CanvasTexture, LinearFilter, LinearMipmapLinearFilter, SRGBColorSpace } from 'three'
import { FONT } from './text'

export const PAGE = { w: 1.28, h: 0.88 }
const W = 1280, H = 880
const M = 70 // margin
const TOP = 148 // first body line
const BODY = 26, LEAD = 40 // font size and line height, px
export const LINES_PER_PAGE = Math.floor((H - M - TOP) / LEAD) // 16
export const ROWS_PER_PAGE = 13

let measurer
const measure = (text, font) => {
  measurer ??= document.createElement('canvas').getContext('2d')
  measurer.font = font
  return measurer.measureText(text).width
}

/** Break one paragraph into lines no wider than `maxPx`. */
function wrap(text, maxPx, font) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next, font) > maxPx) { lines.push(line); line = word } else line = next
  }
  if (line) lines.push(line)
  return lines.length ? lines : ['']
}

/**
 * The pages of a document, by modality:
 * text → `{ type: 'text', lines }`, a spreadsheet → `{ type: 'rows', header, rows, from }`,
 * a deck → `{ type: 'slide', … }`, a photograph → `{ type: 'image' }`, a recording →
 * `{ type: 'media' }`, anything else → `{ type: 'note', lines }`.
 */
export function buildPages(doc) {
  if (!doc) return []
  if (doc.kind === 'image') return [{ type: 'image' }]
  if (doc.kind === 'audio' || doc.kind === 'video') return [{ type: 'media' }]
  if (doc.kind === 'slides') return (doc.slides ?? []).map((s) => ({ type: 'slide', title: s.title, bullets: s.bullets }))
  if (doc.kind === 'sheet') {
    const [header = [], ...rows] = doc.rows ?? []
    const pages = []
    for (let i = 0; i < Math.max(1, rows.length); i += ROWS_PER_PAGE) pages.push({ type: 'rows', header, rows: rows.slice(i, i + ROWS_PER_PAGE), from: i + 1 })
    return pages
  }
  if (doc.kind === 'other') return [{ type: 'note', lines: wrap(doc.note ?? '', W - M * 2, `500 ${BODY}px ${FONT}`) }]

  // A document: wrap every paragraph, keep the blank line between them, then cut into pages.
  const font = `400 ${BODY}px ${FONT}`
  const lines = []
  for (const para of (doc.text ?? '').split(/\n\s*\n/)) {
    if (!para.trim()) continue
    lines.push(...wrap(para.replace(/\n/g, ' ').trim(), W - M * 2, font), '')
  }
  while (lines.at(-1) === '') lines.pop()
  const pages = []
  for (let i = 0; i < Math.max(1, lines.length); i += LINES_PER_PAGE) pages.push({ type: 'text', lines: lines.slice(i, i + LINES_PER_PAGE) })
  return pages
}

function finish(canvas) {
  const t = new CanvasTexture(canvas)
  t.colorSpace = SRGBColorSpace
  t.minFilter = LinearMipmapLinearFilter
  t.magFilter = LinearFilter
  t.anisotropy = 8
  return t
}

const ellipsis = (c, text, maxPx) => {
  if (c.measureText(text).width <= maxPx) return text
  let s = text
  while (s.length > 1 && c.measureText(`${s}…`).width > maxPx) s = s.slice(0, -1)
  return `${s}…`
}

/** Draw one page. `head` is the running header: the file's name and which page this is. */
export function pageTexture(page, head = '') {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  const slide = page.type === 'slide'
  c.fillStyle = slide ? '#141a26' : '#fbf8f3'
  c.fillRect(0, 0, W, H)
  c.textBaseline = 'alphabetic'

  // running header and its rule
  c.font = `600 20px ${FONT}`
  c.fillStyle = slide ? '#7d8aa3' : '#9aa0ab'
  c.fillText(ellipsis(c, head, W - M * 2), M, 64)
  c.fillStyle = slide ? '#2a3448' : '#e4ded3'
  c.fillRect(M, 92, W - M * 2, 2)

  if (page.type === 'text' || page.type === 'note') {
    c.font = `400 ${BODY}px ${FONT}`
    c.fillStyle = '#23262d'
    page.lines.forEach((line, i) => c.fillText(line, M, TOP + i * LEAD))
  } else if (page.type === 'slide') {
    c.font = `700 56px ${FONT}`
    c.fillStyle = '#f4f6fb'
    c.fillText(ellipsis(c, page.title ?? '', W - M * 2), M, 230)
    c.fillStyle = '#4cb8ff'
    c.fillRect(M, 268, 160, 6)
    c.font = `500 34px ${FONT}`
    ;(page.bullets ?? []).forEach((b, i) => {
      const y = 360 + i * 64
      c.fillStyle = '#4cb8ff'
      c.beginPath(); c.arc(M + 10, y - 11, 7, 0, 7); c.fill()
      c.fillStyle = '#d8deea'
      c.fillText(ellipsis(c, b, W - M * 2 - 44), M + 40, y)
    })
  } else if (page.type === 'rows') {
    const cols = Math.max(1, page.header.length)
    const cw = (W - M * 2) / cols
    c.fillStyle = '#2f3747'
    c.fillRect(M, TOP - 36, W - M * 2, 48)
    c.font = `700 24px ${FONT}`
    c.fillStyle = '#f4f6fb'
    page.header.forEach((h, i) => c.fillText(ellipsis(c, h, cw - 24), M + 12 + i * cw, TOP)) // eslint-disable-line
    c.font = `400 24px ${FONT}`
    page.rows.forEach((row, r) => {
      const y = TOP + 48 + r * 48
      if (r % 2 === 0) { c.fillStyle = '#f1ece3'; c.fillRect(M, y - 34, W - M * 2, 46) }
      c.fillStyle = '#8a93a5'
      c.font = `400 18px ${FONT}`
      c.fillText(String(page.from + r), M - 44, y)
      c.font = `400 24px ${FONT}`
      c.fillStyle = '#23262d'
      row.slice(0, cols).forEach((cell, i) => c.fillText(ellipsis(c, String(cell), cw - 24), M + 12 + i * cw, y))
    })
  }
  return finish(canvas)
}

/** A painted sample photograph (sample-drive.js paints into the canvas) as a texture. */
export function paintedTexture(paint, w = 1280, h = 880) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  paint(canvas.getContext('2d'), w, h)
  return finish(canvas)
}
