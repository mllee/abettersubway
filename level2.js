// level2.js — A Better Subway, Level 2 data ("New York City")
// Owner: Lane B. Data only — no logic.
//
// Stylized NYC. Hudson on the west and East River on the east, one
// playable column of water inside each. The off-grid ocean frame
// (defined by `oceanEdges` below) wraps the *left and right* sides
// to match Manhattan's geometry — top and bottom are land (Bronx /
// mainland direction).
//
// Central Park anchors the middle, with small scattered parks
// (Bryant, Madison, Washington, Tompkins, Battery) for local
// routing decisions. Four "speed-bump" parks sit at the ends of
// the two rows that aren't covered by Central Park — they make
// long uninterrupted horizontal trunks costly to lay, pushing the
// optimal solution toward a multi-trunk shape.

// In-grid rivers — one column on each side of Manhattan.
const WATER = [
  ...Array.from({ length: 16 }, (_, i) => [1, i + 1]),   // Hudson (col 1)
  ...Array.from({ length: 16 }, (_, i) => [16, i + 1]),  // East River (col 16)
];

const HILLS = [];

const GREEN_PARKS = [
  // Central Park — 4 cols × 5 rows. Bisects the middle of the map.
  ...[5, 6, 7, 8, 9].flatMap(y => [7, 8, 9, 10].map(x => [x, y])),

  // Small scattered parks (NYC neighborhoods).
  [10, 9], [11, 9],   // Bryant Park (adjacent to Central Park)
  [5, 8],  [6, 8],    // Madison Square
  [5, 11], [6, 11],   // Washington Square
  [10, 12],[11, 12],  // Tompkins Square
  [8, 14], [9, 14],   // Battery Park

  // Speed bumps — break the "long horizontal trunk" shortcut on the
  // two rows that aren't covered by Central Park.
  [5, 3],  [12, 3],   // Carl Schurz / Verrazano Sq      (row 3 breakers)
  [3, 10], [13, 10],  // Lincoln Sq / Stuyvesant Sq      (row 10 breakers)
];

/** @type {import('./mechanics.js').Level} */
export const LEVEL_2 = {
  width: 16,
  height: 16,

  parks: [...WATER, ...HILLS, ...GREEN_PARKS],
  water: WATER,
  hills: HILLS,
  greenParks: GREEN_PARKS,

  // Sides of the playable grid that show off-grid ocean in #app's
  // padding. NYC has Hudson on the west + East River on the east, with
  // land beyond the top and bottom edges.
  oceanEdges: ['left', 'right'],

  // Pinwheel-rotational commuters (unchanged). Each one has both H and
  // V components so no straight-line trunk dominates.
  //
  //   A: Inwood (NW)        → Murray Hill (E mid)      ↘
  //   B: Upper East (NE)    → Brooklyn Heights (S mid) ↙
  //   C: South Brooklyn     → Upper West Side (W mid)  ↖
  //   D: Tribeca (SW)       → Harlem (N mid)           ↗
  commuters: [
    { id: 'A', start: [3, 3],   dest: [14, 8] },
    { id: 'B', start: [14, 3],  dest: [7, 15] },
    { id: 'C', start: [14, 13], dest: [2, 8]  },
    { id: 'D', start: [3, 14],  dest: [9, 3]  },
  ],

  // tools/solve.mjs converges to a 22-tile optimum — a multi-trunk
  // shape (row-4 above Central Park, a col-4 vertical west spine, a
  // row-11 east bar below the park, and a small south step). Naive
  // "single long horizontal" attempts cost 25+ tiles thanks to the
  // speed-bump parks, so the player has to find the multi-trunk
  // shape to hit gold.
  hardCap: 26,
  gold:    22,
  silver:  24,
  bronze:  26,
  deadline: 20.0,

  walkCost: 2.0,
  railCost: 0.5,

  goldSolution: [
    [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
    [12, 7], [13, 7], [14, 7],
    [4, 8], [4, 9], [4, 10], [4, 11],
    [9, 11], [10, 11], [11, 11], [12, 11],
    [4, 12], [7, 12], [8, 12], [9, 12],
    [7, 13],
    [7, 14],
  ],
};
