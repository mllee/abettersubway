// level2.js — A Better Subway, Level 2 data ("New York City")
// Owner: Lane B. Data only — no logic.
//
// Stylized NYC. Hudson on the west and East River on the east, one
// playable column of water inside each. The off-grid ocean frame
// (defined by `oceanEdges` below) wraps the *left and right* sides
// to match Manhattan's geometry — top and bottom are land (Bronx /
// mainland direction).
//
// Central Park anchors the middle, with a one-row transverse cut at
// row 7 (the 79th-Street transverse) splitting it into a north half
// (rows 5–6) and a south half (rows 8–9). Commuters can route
// through, around the east, or around the west — three options
// instead of just "left or right of the park."
//
// Small scattered parks (Bryant, Madison, Washington, Tompkins,
// Battery) add local routing decisions. Four "speed-bump" parks
// sit at the ends of the two rows that aren't covered by Central
// Park — they make long uninterrupted horizontal trunks costly to
// lay, pushing the optimal solution toward a multi-trunk shape.

// In-grid rivers — one column on each side of Manhattan.
const WATER = [
  ...Array.from({ length: 16 }, (_, i) => [1, i + 1]),   // Hudson (col 1)
  ...Array.from({ length: 16 }, (_, i) => [16, i + 1]),  // East River (col 16)
];

const HILLS = [];

const GREEN_PARKS = [
  // Central Park — 4 cols × 5 rows, with a one-row transverse cut
  // (row 7) that mirrors the 79th-Street transverse in real NYC.
  // The cut splits the park into a north half (rows 5–6) and a south
  // half (rows 8–9) and gives commuters a third option beyond
  // "around the east side" / "around the west side": straight across.
  ...[5, 6, 8, 9].flatMap(y => [7, 8, 9, 10].map(x => [x, y])),

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

  // tools/solve.mjs at deadline=20 converges to a 22-tile multi-trunk
  // shape: a row-4 trunk above Central Park, two vertical spines down
  // Hudson (col 4) and East Side (col 12), and a row-13 east-west bar
  // joining them. The 79th-transverse cut at row 7 doesn't appear in
  // the optimum (routing above or below the park is competitive at
  // this park size), but the cut is what makes a *naive* solution
  // (single trunk above the park) viable enough that players reach
  // for it first, then have to find the multi-trunk shape to hit gold.
  hardCap: 26,
  gold:    22,
  silver:  24,
  bronze:  26,
  deadline: 20.0,

  walkCost: 2.0,
  railCost: 0.5,

  goldSolution: [
    [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4],
    [14, 5], [14, 6],
    [12, 9],
    [4, 10], [12, 10],
    [4, 11], [12, 11],
    [4, 12], [12, 12],
    [4, 13], [7, 13], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13],
  ],
};
