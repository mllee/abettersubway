// level1.js — A Better Subway, Level 1 data ("San Francisco")
// Owner: Lane B. Data only — no logic.
//
// Coordinates are [x, y] where x = column (1-indexed, left-to-right) and
// y = row (1-indexed, top-to-bottom).
//
// Obstacle layout matches the SF sketch supplied by the user (grid_example):
// Bay biting the NE corner, Golden Gate Park as a long horizontal strip
// (rows 7–8) split only by a 1-tile choke point at col 2, Telegraph Hill
// and Lafayette as small N-central parks, Twin Peaks / Mt Sutro stepping
// SW from (3,11), Bernal Heights at the bottom, and McLaren-area parks
// in the south-center.
//
// Topology that makes the puzzle interesting:
//   * GGP strip splits the city N/S. Westside passage exists only at col 2.
//     East of col 8, rows 7–8 are open — the "FiDi bypass".
//   * Twin Peaks → Bernal forms a diagonal that blocks S-central E/W.
//   * The bay pocket in the NE forces approaches to FiDi from the SW.
//
// Commuters are arranged in a rotational pattern — each one heads in a
// different cardinal-ish direction, with both horizontal and vertical
// components. The intent is that no single trunk dominates: a player
// reaching gold via a horizontal+vertical "L" looks very different from
// another player who reaches gold by zigzagging through the Twin Peaks
// foothills. Solver runs (see tools/solve.mjs) confirm many distinct
// optimal layouts exist at the gold tile count.

const WATER = [
  [13, 1], [14, 1], [15, 1], [16, 1],
           [14, 2], [15, 2], [16, 2],
                    [15, 3], [16, 3],
                             [16, 4],
];

const HILLS = [
  // Twin Peaks + Mt Sutro stepping SW from the center
  [3, 11], [4, 11],
  [5, 12],
  [5, 13],
  // Bernal Heights
  [6, 15], [6, 16],
];

const GREEN_PARKS = [
  // Small N-central parks (Telegraph Hill + Lafayette)
  [12, 4],
  [10, 5],
  // Golden Gate Park strip — single gap at col 2 + a half-gap at (8,8)
  [1, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7],
  [1, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
  // McLaren / Glen Canyon cluster (south-central)
  [9, 13], [10, 13],
  [9, 14],
  [9, 15],
];

/** @type {import('./mechanics.js').Level} */
export const LEVEL_1 = {
  width: 16,
  height: 16,

  // Mechanics treats `parks` as the union of all impassable tiles.
  // The UI splits them back into water / hills / greenParks subsets so
  // each renders with a distinct sprite.
  parks: [...WATER, ...HILLS, ...GREEN_PARKS],
  water: WATER,
  hills: HILLS,
  greenParks: GREEN_PARKS,

  // Sides of the playable grid that show off-grid ocean in #app's
  // padding. SF: Bay continues past the top and east edges.
  oceanEdges: ['top', 'right'],

  // Four commuters arranged in a *rotational* pattern — each one heads in
  // a different cardinal-ish direction, so no single "downtown corridor"
  // helps everyone. Solver search (30 random hillclimbs) finds 30
  // geometrically distinct 19-tile solutions, which is the property we
  // want: the player's first passing solution and the next player's
  // first passing solution look completely different.
  //
  //   A: Pacific Heights (NW)   → Outer Mission (S)
  //   B: Financial Dist (NE)    → Outer Richmond (W mid)
  //   C: Bayview (SE)           → Marina (N)
  //   D: Bernal Heights (SW)    → Mission Bay (E mid)
  //
  // Walking baselines (with the cross-commuter blocking rule applied):
  //   A: 38, B: 32, C: 36, D: 34 — all well over the 20-min deadline.
  commuters: [
    { id: 'A', start: [2, 4],   dest: [8, 15]  },
    { id: 'B', start: [14, 4],  dest: [2, 8]   },
    { id: 'C', start: [14, 14], dest: [8, 2]   },
    { id: 'D', start: [3, 14],  dest: [15, 9]  },
  ],

  // Tier targets from tools/solve.mjs (multi-start hillclimb). Diverse
  // geometric optima exist at the gold count — many different shapes
  // pass with 21 tiles, so two players solving this rarely land on
  // the same rail layout.
  //   gold   = 21  solver-verified minimum
  //   silver = 23  any reasonable "+" or "L" lands here
  //   bronze = 25 = hardCap. Beyond this the budget runs out.
  hardCap: 25,
  gold:    21,
  silver:  23,
  bronze:  25,
  deadline: 20.0,

  walkCost: 2.0,
  railCost: 0.5,

  // Canonical 21-tile gold solution from tools/solve.mjs. Connected
  // shape: a long row-6 trunk (Geary corridor) bending south on col 9
  // (Van Ness) plus a row-9 east extension and a small col-9 south
  // continuation.
  goldSolution: [
    [8, 5],
    [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6],
    [9, 7], [9, 8], [9, 9],
    [10, 9], [11, 9], [12, 9], [13, 9], [14, 9],
    [9, 10], [9, 11], [8, 12], [9, 12],
  ],
};
