// Where each person stands: four places on the diagonals around the table, facing it (nobody stands
// straight between another person and the board). Two people must not start inside each other, so a
// newcomer takes the first place nobody has claimed (claims travel as the presence field `spawn`).
// Alone, you always get place 0, so tests are repeatable.
export const TABLE = { x: 0, z: -1.2, top: 0.74, radius: 0.62 }
const D = 0.95
// yaw = atan2(dx, dz) of the offset from the table: a camera at that yaw looks at the table
export const SPAWNS = [
  { position: [TABLE.x + D, 0, TABLE.z + D], yaw: Math.PI / 4 },
  { position: [TABLE.x - D, 0, TABLE.z + D], yaw: -Math.PI / 4 },
  { position: [TABLE.x + D, 0, TABLE.z - D], yaw: (3 * Math.PI) / 4 },
  { position: [TABLE.x - D, 0, TABLE.z - D], yaw: (-3 * Math.PI) / 4 },
]

export function pickSpawn(peers) {
  const taken = new Set(peers.map((p) => p.fields?.spawn).filter((s) => s !== undefined))
  for (let s = 0; s < SPAWNS.length; s++) if (!taken.has(s)) return s
  return peers.length % SPAWNS.length
}

/**
 * A world point in the space of the person standing at `slot` (the XR origin's local space): what the
 * emulated headset, hands and controllers use for `look_at` and `set_transform` in XR tests.
 */
export function toLocal([x, y, z], slot = 0) {
  const { position: [px, py, pz], yaw } = SPAWNS[slot]
  const dx = x - px, dz = z - pz, c = Math.cos(-yaw), s = Math.sin(-yaw)
  return [c * dx + s * dz, y - py, -s * dx + c * dz]
}
export function toWorld([x, y, z], slot = 0) {
  const { position: [px, py, pz], yaw } = SPAWNS[slot]
  const c = Math.cos(yaw), s = Math.sin(yaw)
  return [px + c * x + s * z, py + y, pz - s * x + c * z]
}
