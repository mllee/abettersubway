// level1.js — A Better Subway, Level 1 data ("Four Trips, One Shortcut")
// Owner: Lane B. Data only — no logic.
//
// Coordinates are [x, y] where x = column (1-indexed, left-to-right) and
// y = row (1-indexed, top-to-bottom). Derived directly from the spec's
// ASCII board.

/** @type {import('./mechanics.js').Level} */
export const LEVEL_1 = {
  width: 15,
  height: 15,

  // Park tiles (block rail placement; walkable for commuters).
  parks: [
    [6, 3],  [7, 3],
    [6, 4],  [7, 4],  [10, 4], [11, 4],
    [10, 5], [11, 5],
    [8, 6],  [9, 6],
    [8, 7],  [9, 7],
    [9, 9],  [10, 9],
    [9, 10], [10, 10],
    [4, 11], [5, 11],
    [4, 12], [5, 12], [8, 12], [9, 12],
    [8, 13], [9, 13],
  ],

  // Commuters: id is the uppercase label (start); destination uses the
  // matching lowercase label on the board.
  commuters: [
    { id: 'A', start: [2, 2],  dest: [14, 7] },
    { id: 'B', start: [3, 6],  dest: [13, 2] },
    { id: 'C', start: [15, 9], dest: [2, 9]  },
    { id: 'D', start: [6, 14], dest: [3, 13] },
  ],

  hardCap: 22,
  gold:    16,
  silver:  19,
  bronze:  22,
  deadline: 20.0,

  walkCost: 2.0,
  railCost: 0.5,
};

// Reference: walking-only baseline (zero rail). Lane B should match these
// when computeRoutes is called with an empty rail set:
//
//   A -> a : 34 min
//   B -> b : 28 min
//   C -> c : 26 min
//   D -> d :  8 min  (already passes with no rail — intentional)
//
// Reference: spec's gold corridor (16 tiles). User will hand-verify whether
// this actually clears all commuters under 20 min. If not, the spec or the
// cost model needs adjusting before tiers are authoritative.
//
//   (4,5), (5,5), (6,5), (7,5),
//   (7,6), (7,7),
//   (7,8), (8,8), (9,8), (10,8), (11,8),
//   (11,7), (12,7),
//   (12,6), (12,5),
//   (13,5)
