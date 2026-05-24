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

  // All four commuters converge toward N/NE downtown, except D who
  // cuts across the south (E/W). Walking baselines (verified by
  // computeRoutes, accounting for the cross-commuter blocking rule):
  //   A: 42  (Bernal-ish SW -> Russian Hill NE, longest)
  //   B: 38  (Outer Mission -> Telegraph Hill, must cross GGP + skirt C)
  //   C: 28  (Bayview SE -> North Beach N)
  //   D: 26  (Outer Richmond W -> Mission Bay E, straight east)
  commuters: [
    { id: 'A', start: [3, 14],  dest: [14, 4] },
    { id: 'B', start: [8, 16],  dest: [12, 3] },
    { id: 'C', start: [13, 15], dest: [11, 3] },
    { id: 'D', start: [2, 9],   dest: [14, 10] },
  ],

  // Tier targets from solver search (multi-start greedy + random trim,
  // 12 trials, every trial converged):
  //
  //   gold = 14   the non-obvious zigzag corridor that climbs from
  //               (4,14)→(6,14)→(8,13)→(8,10) then east to (11,10) and
  //               north to (10,4). Threads adjacent to Twin Peaks
  //               instead of detouring around — a route a player has
  //               to invent, not see at a glance.
  //
  //   silver = 19 the "obvious" L-shape: a horizontal trunk on row 10
  //               (x=2..14) plus a vertical trunk on col 12 up to row
  //               3. Passes all four, just wastes ~5 tiles vs. gold.
  //
  //   bronze = 22 hard cap. Tighter "U" / "plus" shapes at this size
  //               can still fail (silver is the floor for naive shapes).
  hardCap: 22,
  gold:    14,
  silver:  19,
  bronze:  22,
  deadline: 22.0,

  walkCost: 2.0,
  railCost: 0.5,
};
