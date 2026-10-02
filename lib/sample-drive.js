// The library the explorer shows until someone connects a real Google Drive: the same shapes
// `lib/drive.js` returns (folders, files by modality, documents), so the scene code has one path.
// Images are painted here instead of downloaded, so the app needs no network at all.

const FILES = [
  { id: 'research', parent: 'sample-root', name: 'Research', kind: 'folder', modified: '2026-09-28' },
  { id: 'trips', parent: 'sample-root', name: 'Trips', kind: 'folder', modified: '2026-08-14' },
  { id: 'readme', parent: 'sample-root', name: 'Read me first.gdoc', kind: 'doc', modified: '2026-10-01' },
  { id: 'budget', parent: 'sample-root', name: 'Q4 budget.gsheet', kind: 'sheet', modified: '2026-09-30' },
  { id: 'pitch', parent: 'sample-root', name: 'Pitch deck.gslides', kind: 'slides', modified: '2026-09-22' },
  { id: 'handbook', parent: 'sample-root', name: 'Handbook.pdf', kind: 'pdf', modified: '2026-07-04', size: 2.4 * 1024 * 1024, mime: 'application/pdf' },

  { id: 'presence', parent: 'research', name: 'Presence in XR.gdoc', kind: 'doc', modified: '2026-09-27' },
  { id: 'latency', parent: 'research', name: 'Latency notes.txt', kind: 'text', modified: '2026-09-19' },
  { id: 'plot', parent: 'research', name: 'Field study plot.png', kind: 'image', modified: '2026-09-18' },
  { id: 'interview', parent: 'research', name: 'Interview 03.m4a', kind: 'audio', modified: '2026-09-15', duration: 214 },

  { id: 'dolomites', parent: 'trips', name: 'Dolomites notes.gdoc', kind: 'doc', modified: '2026-08-12' },
  { id: 'ridge', parent: 'trips', name: 'Ridge at dawn.jpg', kind: 'image', modified: '2026-08-11' },
  { id: 'packlist', parent: 'trips', name: 'Pack list.gsheet', kind: 'sheet', modified: '2026-08-09' },
  { id: 'descent', parent: 'trips', name: 'Descent.mp4', kind: 'video', modified: '2026-08-10', duration: 96 },
]

export const SAMPLE_ROOT = { id: 'sample-root', name: 'Sample library', trail: [] }
export const SAMPLE_FOLDERS = ['sample-root', ...FILES.filter((f) => f.kind === 'folder').map((f) => f.id)]
export const sampleIds = () => FILES.map((f) => f.id)
export const sampleFolder = (folderId = 'sample-root') => FILES.filter((f) => f.parent === folderId).map(({ parent, ...f }) => f)

const DOCS = {
  readme: `Reading together in XR

This is the sample library. Everything you see on the wall behind you is a file, and everything in
the reader in front of you is its content, laid out for a headset rather than for a 13-inch laptop.

Point at a card and pull the trigger (or poke it with a finger, or click it with the mouse) to open
it. The page you turn to is the page everyone in the room turns to: the open document and its page
number live in the room's shared state, so two people standing at the same table always read the
same paragraph. Where the panel floats is shared too — take it by the bar under the page and move
it to where the group can see.

To read your own Drive instead, press Connect Google Drive. The app asks Google for a read-only
token in your own browser; nothing is uploaded and no token is ever put into shared state. Each
person connects for themselves, and the room keeps pointing at the same folder for all of them.

Four modalities are laid out differently. A document becomes paper pages of wrapped text. A
spreadsheet becomes a striped table, fourteen rows at a time. A deck becomes one dark slide per
page with its bullets. An image fills the page, and a recording becomes a shared transport: when
one person presses play, everybody's playhead starts moving from the same place.`,

  presence: `Presence in XR — reading notes

A body in a shared space does most of the work of grounding a conversation. When two people read
the same document side by side, almost nothing they say is about the document's content; it is
about position. "This paragraph." "Further down." "Back one page." Each of those only works if both
people can see where the other is looking.

Pose, then. Heads and hands move every frame and matter only while their owner is here, which is
exactly the definition of presence rather than of shared state: they go out as one small quantised
message about twenty times a second and are thrown away when the person leaves.

The document, by contrast, has to survive. The open file and its page number are written once, when
someone presses a button, and are the first thing a late joiner receives.

The useful rule that falls out: ask how long a fact should outlive the person who produced it. A
hand pose, a quarter of a second. A playhead, as long as the track plays. A page number, as long as
the room exists. Three different places to put it.

Open questions for the next study

How much does a shared page number help, versus letting each reader move freely with a marker
showing where the others are? The second costs more presence traffic but may annoy people less.

Does a floating panel beat a panel pinned to a wall? Early answer: people move the panel once, at
the start, and then never touch it again — but they do want that one move.`,

  latency: `latency notes (raw)

relay round trip, same city: 18-34 ms
relay round trip, across the atlantic: 95-140 ms

page turn felt instant to both readers below ~120 ms. above ~250 ms the second reader starts
pressing the button again, which is why the button should look pressed locally straight away and
only then wait for the document.

playhead: do not send the time. send "playing since t0, from offset". everyone computes the rest
locally. a 150 ms clock difference is inaudible; a 150 ms stream of positions is not.

todo: measure a late joiner downloading a room that has been open for a day.`,

  dolomites: `Dolomites, five days

Day one. Bus to the valley, then the old mine road. Rain from three o'clock, the kind that arrives
with no warning at all, and a hut with a stove that dried four pairs of boots overnight.

Day two. Up through the scree to the ridge. Two hours of nothing but the sound of our own
breathing, then the whole range opened at once. The photograph on the wall is from that morning and
it does not come close.

Day three. Rest day, which turned into a nine-kilometre walk to find bread.

Day four. The traverse. Cables for the first pitch, then easy ground that keeps going much longer
than the map suggests. We finished in the dark, which was a mistake, and a good one.

Day five. Down to the lake and home. Pack list is in this folder; the only thing missing from it
was a second pair of dry socks, which is the only thing missing from every pack list.`,
}

const SHEETS = {
  budget: [
    ['Item', 'Owner', 'Q4 plan', 'Spent', 'Left'],
    ['Headsets (6)', 'Ada', '3600', '3480', '120'],
    ['Relay hosting', 'Ada', '480', '305', '175'],
    ['Field study travel', 'Linh', '2200', '1870', '330'],
    ['Participant fees', 'Linh', '1500', '900', '600'],
    ['Audio recording kit', 'Sam', '640', '612', '28'],
    ['Scanning service', 'Sam', '1800', '1800', '0'],
    ['Design contract', 'Noor', '4000', '2500', '1500'],
    ['Font licence', 'Noor', '350', '350', '0'],
    ['Cloud render', 'Ada', '900', '418', '482'],
    ['Spare parts', 'Sam', '300', '96', '204'],
    ['Workshop room', 'Linh', '700', '700', '0'],
    ['Printing', 'Noor', '200', '64', '136'],
    ['Contingency', '—', '2000', '0', '2000'],
    ['Total', '', '18670', '13095', '5575'],
  ],
  packlist: [
    ['Item', 'Who', 'Weight g', 'Packed'],
    ['Shell jacket', 'both', '340', 'yes'],
    ['Down jacket', 'both', '390', 'yes'],
    ['Harness', 'both', '280', 'yes'],
    ['Via ferrata set', 'both', '620', 'yes'],
    ['Helmet', 'both', '300', 'yes'],
    ['Stove + gas', 'M', '410', 'yes'],
    ['Pot', 'M', '180', 'yes'],
    ['Water filter', 'K', '90', 'no'],
    ['First aid', 'K', '240', 'yes'],
    ['Map + compass', 'M', '110', 'yes'],
    ['Head torch', 'both', '85', 'yes'],
    ['Dry socks x2', 'both', '120', 'no'],
    ['Camera', 'K', '640', 'yes'],
  ],
}

const SLIDES = {
  pitch: [
    { title: 'Read together, not alone', bullets: ['Documents are read in groups', 'Screens make that hard', 'Headsets make it easy'] },
    { title: 'The problem', bullets: ['One screen, one cursor', 'Everyone else watches', '"Scroll down a bit" × 40'] },
    { title: 'What we built', bullets: ['A wall of your Drive', 'One shared reader panel', 'Page, playhead and panel are shared'] },
    { title: 'Modalities', bullets: ['Docs → paper pages', 'Sheets → tables', 'Decks → slides', 'Images and recordings'] },
    { title: 'How it travels', bullets: ['Poses through presence, 20 Hz', 'Pages through the document', 'Nothing per frame in storage'] },
    { title: 'What is next', bullets: ['Annotations anyone can place', 'Search across the drive', 'Hand-off of the reading lead'] },
  ],
}

/** Painted stand-ins for photographs: a plot and a mountain ridge, drawn into a canvas. */
const IMAGES = {
  plot: (c, w, h) => {
    c.fillStyle = '#fdfcf8'
    c.fillRect(0, 0, w, h)
    const m = { l: w * 0.12, r: w * 0.06, t: h * 0.12, b: h * 0.14 }
    const pw = w - m.l - m.r, ph = h - m.t - m.b
    c.strokeStyle = '#d8d4cc'
    c.lineWidth = 2
    for (let i = 0; i <= 5; i++) { const y = m.t + (ph * i) / 5; c.beginPath(); c.moveTo(m.l, y); c.lineTo(m.l + pw, y); c.stroke() }
    c.strokeStyle = '#2f3440'
    c.lineWidth = 3
    c.beginPath(); c.moveTo(m.l, m.t); c.lineTo(m.l, m.t + ph); c.lineTo(m.l + pw, m.t + ph); c.stroke()
    const series = [['#4cb8ff', [0.1, 0.22, 0.3, 0.42, 0.55, 0.62, 0.74, 0.8]], ['#ff6b57', [0.05, 0.12, 0.26, 0.3, 0.37, 0.52, 0.58, 0.69]]]
    for (const [color, points] of series) {
      c.strokeStyle = color
      c.lineWidth = 5
      c.beginPath()
      points.forEach((v, i) => { const x = m.l + (pw * i) / (points.length - 1), y = m.t + ph * (1 - v); i ? c.lineTo(x, y) : c.moveTo(x, y) })
      c.stroke()
      c.fillStyle = color
      points.forEach((v, i) => { const x = m.l + (pw * i) / (points.length - 1), y = m.t + ph * (1 - v); c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill() })
    }
    c.fillStyle = '#2f3440'
    c.font = `600 ${Math.round(h * 0.055)}px system-ui, sans-serif`
    c.fillText('Shared page turns vs. free reading', m.l, m.t - h * 0.035)
    c.font = `500 ${Math.round(h * 0.04)}px system-ui, sans-serif`
    c.fillStyle = '#6b7384'
    c.fillText('agreement score over eight sessions', m.l, h - m.b * 0.35)
  },
  ridge: (c, w, h) => {
    const sky = c.createLinearGradient(0, 0, 0, h * 0.7)
    sky.addColorStop(0, '#12213f')
    sky.addColorStop(0.55, '#8a5f7a')
    sky.addColorStop(1, '#f0a070')
    c.fillStyle = sky
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#fff3d6'
    c.beginPath(); c.arc(w * 0.68, h * 0.46, h * 0.06, 0, 7); c.fill()
    const ridge = (base, amp, color, seed) => {
      c.fillStyle = color
      c.beginPath()
      c.moveTo(0, h)
      for (let x = 0; x <= w; x += w / 48) {
        const t = x / w
        const y = base - amp * (Math.sin(t * 7 + seed) * 0.5 + Math.sin(t * 17 + seed * 2) * 0.3 + Math.sin(t * 3 + seed) * 0.5)
        c.lineTo(x, y)
      }
      c.lineTo(w, h)
      c.closePath()
      c.fill()
    }
    ridge(h * 0.62, h * 0.12, '#6d5a6e', 1.2)
    ridge(h * 0.72, h * 0.14, '#43394d', 2.7)
    ridge(h * 0.86, h * 0.1, '#241f2c', 4.1)
    c.fillStyle = 'rgba(255,255,255,0.75)'
    for (let i = 0; i < 90; i++) { const x = Math.sin(i * 12.9) * 0.5 + 0.5, y = (Math.sin(i * 78.2) * 0.5 + 0.5) * 0.42; c.fillRect(x * w, y * h, 2, 2) }
  },
}

/** The sample stand-in for `fetchDocument` in lib/drive.js. */
export function sampleDocument(file) {
  if (DOCS[file.id]) return { kind: 'doc', name: file.name, text: DOCS[file.id] }
  if (SHEETS[file.id]) return { kind: 'sheet', name: file.name, rows: SHEETS[file.id] }
  if (SLIDES[file.id]) return { kind: 'slides', name: file.name, slides: SLIDES[file.id] }
  if (IMAGES[file.id]) return { kind: 'image', name: file.name, paint: IMAGES[file.id] }
  if (file.kind === 'audio' || file.kind === 'video') return { kind: file.kind, name: file.name, duration: file.duration ?? 60 }
  return { kind: 'other', name: file.name, note: `${file.mime ?? file.kind}\n${file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}\nThis format opens in Drive, not in the headset.` }
}
