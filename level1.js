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
// Commuters all converge toward NE / N-central downtown (the classic SF
// inbound commute), except D who is the cross-town outlier. The greedy
// "one rail per commuter" approach lands around silver. The non-obvious
// gold is a 14-tile zigzag that threads through the Twin Peaks foothills
// at rows 11–14 and steps NE — a route a player won't naturally try
// because it runs *adjacent* to the mountain obstacle instead of
// detouring around it.

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
  //   A: 38, B: 32, C: 36, D: 34 — all well over the 22-min deadline.
  commuters: [
    { id: 'A', start: [2, 4],   dest: [8, 15]  },
    { id: 'B', start: [14, 4],  dest: [2, 8]   },
    { id: 'C', start: [14, 14], dest: [8, 2]   },
    { id: 'D', start: [3, 14],  dest: [15, 9]  },
  ],

  // Tier targets from solver search:
  //   gold   = 19  every random hillclimb finds a 19-tile solution but
  //                each one *looks different*. There are many equally-
  //                optimal geometries, so the player gets the "wait,
  //                this could be done totally differently" feeling
  //                instead of "everyone solves it with the same line."
  //   silver = 22  a naive "+" or "L" combo lands around here; player's
  //                first instinct works but wastes a few tiles.
  //   bronze = 25  hard cap. Beyond this the budget runs out before
  //                anyone gets to work.
  hardCap: 25,
  gold:    19,
  silver:  22,
  bronze:  25,
  deadline: 22.0,

  walkCost: 2.0,
  railCost: 0.5,

  // One canonical 19-tile gold solution, surfaced via the "Reveal best
  // solution" button in the success modal. There are many geometrically
  // distinct 19-tile solutions; this is one found by a greedy add+trim
  // solver. Coords are [x, y].
  goldSolution: [
    [8, 3], [8, 4], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [8, 6],
    [9, 6], [9, 7], [9, 8], [9, 9], [10, 9], [9, 10], [9, 11], [8, 12],
    [9, 12], [8, 13], [8, 14],
  ],
};
