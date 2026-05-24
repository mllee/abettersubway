// mechanics.js — A Better Subway, game mechanics module
// Owner: Lane B. Lane C imports from here; Lane A never touches this file.
//
// Read CONTRACT.md before editing. Do NOT change the exported API signatures
// or rejection reasons — Lane C builds against them.
//
// Edge cost model (the one decision that determines every path):
//   - Moving from u to adjacent v costs the *entering-tile* cost of v.
//   - v is rail  -> level.railCost (e.g. 0.5)
//   - v is open / start / dest -> level.walkCost (e.g. 2.0)
//   - v is park -> IMPASSABLE (commuters cannot enter; rail cannot be placed).
//   - 4-connected grid (no diagonals).
//   - Starting tile is not counted in cost; only traversed edges count.
//
// (Earlier draft had parks as walkable; flipped to barriers on user request
// because "parks should block commutes too, not just rail.")

import { LEVEL_1 } from './level1.js';

/**
 * @typedef {[number, number]} Coord  - [x, y]; x is 1-indexed column, y is 1-indexed row.
 *
 * @typedef {Object} Commuter
 * @property {string} id        - 'A' | 'B' | 'C' | 'D'
 * @property {Coord} start
 * @property {Coord} dest
 *
 * @typedef {Object} Level
 * @property {number} width
 * @property {number} height
 * @property {Coord[]} parks
 * @property {Commuter[]} commuters
 * @property {number} hardCap   - max rail tiles allowed
 * @property {number} gold      - rail count <= this and allPass -> 'gold'
 * @property {number} silver
 * @property {number} bronze
 * @property {number} deadline  - minutes; commuter passes if time <= deadline
 * @property {number} walkCost
 * @property {number} railCost
 *
 * @typedef {Object} State
 * @property {Level} level
 * @property {Set<string>} rail   - keys "x,y" of rail tile coords. Mutable.
 *
 * @typedef {'park'|'start'|'dest'|'cap'|'occupied'|'empty'|'out-of-bounds'} RejectReason
 *
 * @typedef {Object} EditResult
 * @property {boolean} ok
 * @property {RejectReason} [reason]
 *
 * @typedef {Object} CommuterResult
 * @property {string} id
 * @property {number} time         - minutes; Infinity if no path exists
 * @property {Coord[]} path        - ordered coords start..dest; [] if no path
 *
 * @typedef {Object} Routes
 * @property {CommuterResult[]} commuters
 * @property {boolean} allPass
 * @property {number} railCount
 * @property {'gold'|'silver'|'bronze'|'fail'} medal
 * @property {{id: string, time: number} | null} worst
 */

/**
 * Create initial game state for a level. Rail set is empty.
 * @param {Level} level
 * @returns {State}
 */
export function createState(level) {
  return { level, rail: new Set() };
}

/**
 * Place a rail tile at (x, y). Mutates state.rail.
 *
 * Rejection rules — check in this order, return first failure:
 *   1. out-of-bounds: x < 1 || x > level.width || y < 1 || y > level.height
 *   2. park:          tile is in level.parks
 *   3. start:         tile is a commuter start
 *   4. dest:          tile is a commuter destination
 *   5. occupied:      tile is already in state.rail
 *   6. cap:           state.rail.size >= level.hardCap
 *
 * On success: add "x,y" to state.rail and return { ok: true }.
 *
 * @param {State} state
 * @param {number} x
 * @param {number} y
 * @returns {EditResult}
 */
export function placeRail(state, x, y) {
  const { level } = state;
  if (x < 1 || x > level.width || y < 1 || y > level.height) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  if (level.parks.some(([px, py]) => px === x && py === y)) {
    return { ok: false, reason: 'park' };
  }
  if (level.commuters.some(c => c.start[0] === x && c.start[1] === y)) {
    return { ok: false, reason: 'start' };
  }
  if (level.commuters.some(c => c.dest[0] === x && c.dest[1] === y)) {
    return { ok: false, reason: 'dest' };
  }
  const k = `${x},${y}`;
  if (state.rail.has(k)) {
    return { ok: false, reason: 'occupied' };
  }
  if (state.rail.size >= level.hardCap) {
    return { ok: false, reason: 'cap' };
  }
  state.rail.add(k);
  return { ok: true };
}

/**
 * Remove a rail tile at (x, y). Mutates state.rail.
 *
 * Rejection rules:
 *   1. out-of-bounds
 *   2. empty: tile is not currently in state.rail
 *
 * On success: delete "x,y" from state.rail and return { ok: true }.
 *
 * @param {State} state
 * @param {number} x
 * @param {number} y
 * @returns {EditResult}
 */
export function removeRail(state, x, y) {
  const { level } = state;
  if (x < 1 || x > level.width || y < 1 || y > level.height) {
    return { ok: false, reason: 'out-of-bounds' };
  }
  const k = `${x},${y}`;
  if (!state.rail.has(k)) {
    return { ok: false, reason: 'empty' };
  }
  state.rail.delete(k);
  return { ok: true };
}

/**
 * Compute current routes for all commuters given current rail placement.
 *
 * Algorithm:
 *   For each commuter, run Dijkstra from start over the 4-connected grid.
 *   Edge cost = entering-tile cost (see file header).
 *   Record shortest time and path to commuter.dest.
 *   If unreachable, time = Infinity, path = [].
 *
 * Medal logic:
 *   !allPass               -> 'fail'
 *   allPass, count<=gold   -> 'gold'
 *   allPass, count<=silver -> 'silver'
 *   allPass, count<=bronze -> 'bronze'
 *   (hardCap should equal bronze, so the bronze branch is the ceiling.)
 *
 * `worst` is the commuter with the highest time (the one closest to or
 * over the deadline). null if commuters is empty.
 *
 * @param {State} state
 * @returns {Routes}
 */
export function computeRoutes(state) {
  const { level } = state;
  const parkSet = new Set(level.parks.map(([x, y]) => `${x},${y}`));
  const commuters = level.commuters.map(c => {
    const { time, path } = dijkstra(state, c.start, c.dest, parkSet);
    return { id: c.id, time, path };
  });

  const allPass = commuters.every(c => c.time <= level.deadline);
  const railCount = state.rail.size;

  let medal;
  if (!allPass) medal = 'fail';
  else if (railCount <= level.gold) medal = 'gold';
  else if (railCount <= level.silver) medal = 'silver';
  else medal = 'bronze';

  let worst = null;
  for (const c of commuters) {
    if (worst === null || c.time > worst.time) worst = { id: c.id, time: c.time };
  }

  return { commuters, allPass, railCount, medal, worst };
}

function dijkstra(state, src, dst, parkSet) {
  const { level } = state;
  const W = level.width, H = level.height;
  const nNodes = W * H;
  const idx = (x, y) => (y - 1) * W + (x - 1);

  const dist = new Array(nNodes).fill(Infinity);
  const prev = new Array(nNodes).fill(-1);
  const visited = new Array(nNodes).fill(false);

  const srcI = idx(src[0], src[1]);
  const dstI = idx(dst[0], dst[1]);
  dist[srcI] = 0;

  while (true) {
    let u = -1;
    let best = Infinity;
    for (let i = 0; i < nNodes; i++) {
      if (!visited[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1 || u === dstI) break;
    visited[u] = true;

    const ux = (u % W) + 1;
    const uy = Math.floor(u / W) + 1;
    const deltas = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of deltas) {
      const vx = ux + dx, vy = uy + dy;
      if (vx < 1 || vx > W || vy < 1 || vy > H) continue;
      if (parkSet.has(`${vx},${vy}`)) continue; // parks are impassable
      const v = idx(vx, vy);
      if (visited[v]) continue;
      const cost = state.rail.has(`${vx},${vy}`) ? level.railCost : level.walkCost;
      const alt = dist[u] + cost;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  if (dist[dstI] === Infinity) {
    return { time: Infinity, path: [] };
  }

  const path = [];
  let cur = dstI;
  while (cur !== -1) {
    const cx = (cur % W) + 1;
    const cy = Math.floor(cur / W) + 1;
    path.push([cx, cy]);
    if (cur === srcI) break;
    cur = prev[cur];
  }
  path.reverse();

  return { time: dist[dstI], path };
}
