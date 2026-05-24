// level2.js — A Better Subway, Level 2 data ("New York City")
// Owner: Lane B. Data only — no logic.
//
// Stylized NYC: Manhattan as a long N–S island with rivers on each side,
// Central Park dominating the middle, a single Brooklyn Bridge tile as
// the only passage to Brooklyn at the south. Bryant Park, Union Square,
// and Washington Square as small decoy parks. Not to scale; nothing
// north of the Bronx is shown.
//
// Design choices carried over from Level 1's lessons:
//   * Rotational commuters — A and B are mirrored diagonals around
//     Central Park; C must cross the bridge; D is the short crosstown
//     that's tempting to ignore (and *actually* fine to ignore — it
//     passes at walking baseline).
//   * Central Park is the channeling obstacle: nothing crosses it, so
//     N–S Manhattan traffic must hug either col 5 (west side) or col
//     12 (east side). Different commuters prefer different sides, so
//     there's no single "obvious" trunk.
//   * The Brooklyn Bridge at (8, 14) is the forced choke for C. Anyone
//     crossing the East River uses that tile. Sharing it is structural,
//     not a design accident.
//   * Bryant / Union / Washington Squares are small surgical parks that
//     interrupt naive horizontal trunks in lower Manhattan.

const WATER = [
  // Hudson River — full west column
  ...Array.from({ length: 16 }, (_, i) => [1, i + 1]),
  // Harlem River notch at top
  [2, 1], [13, 1], [14, 1],
  // East River — eastern two columns, rows 1–13
  ...Array.from({ length: 13 }, (_, i) => [15, i + 1]),
  ...Array.from({ length: 13 }, (_, i) => [16, i + 1]),
  // Upper Bay / harbor: row 14 is water across, except (8,14) which is
  // the Brooklyn Bridge (the only land tile on that row).
  ...Array.from({ length: 16 }, (_, i) => [i + 1, 14]).filter(([x]) => x !== 8),
  // Brooklyn's water borders
  [2, 15], [2, 16], [14, 15], [14, 16],
  [15, 15], [15, 16], [16, 15], [16, 16],
];

const HILLS = []; // NYC is flat

const GREEN_PARKS = [
  // Central Park — 6 cols × 5 rows, the dominating middle obstacle
  ...[4, 5, 6, 7, 8].flatMap(y => [6, 7, 8, 9, 10, 11].map(x => [x, y])),
  // Bryant Park (tiny, Midtown)
  [8, 10],
  // Washington Square (tiny, West Village)
  [6, 12],
  // Union Square (tiny, between Village and Midtown South)
  [10, 12],
];

/** @type {import('./mechanics.js').Level} */
export const LEVEL_2 = {
  width: 16,
  height: 16,

  parks: [...WATER, ...HILLS, ...GREEN_PARKS],
  water: WATER,
  hills: HILLS,
  greenParks: GREEN_PARKS,

  // Four commuters with rotational + bridge + decoy structure:
  //   A: Inwood (NW)        → Lower East Side (SE)   long diagonal, must skirt Central Park west
  //   B: Upper East (NE)    → Tribeca (SW)           opposite diagonal, must skirt park east
  //   C: Williamsburg (SE)  → Harlem (N)             crosses the Brooklyn Bridge + park
  //   D: West Village (SW)  → Lower East Side (SE)   short crosstown, walks under deadline already
  //
  // Walking baselines:
  //   A: 38, B: 36, C: 44, D: 20
  // D passes for free at walking. The "trap" is that the player will
  // worry about D and lay rail for them anyway, wasting budget.
  commuters: [
    { id: 'A', start: [4, 2],   dest: [12, 13] },
    { id: 'B', start: [13, 3],  dest: [5, 13]  },
    { id: 'C', start: [10, 16], dest: [8, 2]   },
    { id: 'D', start: [3, 11],  dest: [13, 11] },
  ],

  // Tier targets from solver search (20 random hillclimbs):
  //   gold   = 15  the floor; 17 of 20 trials produced *geometrically
  //                distinct* 15-tile solutions, so different players
  //                solve it different ways.
  //   silver = 18  a sloppier shape — any naive run lands here.
  //   bronze = 22  hard cap.
  hardCap: 22,
  gold:    15,
  silver:  18,
  bronze:  22,
  deadline: 22.0,

  walkCost: 2.0,
  railCost: 0.5,

  // Canonical 15-tile gold solution surfaced via the "Reveal best
  // solution" button. Found by tools/solve.mjs (multi-start hillclimb;
  // 27 of 30 trials hit 15, matching the designer's gold target).
  goldSolution: [
    [5, 3], [8, 3], [5, 4], [5, 5], [5, 6], [5, 7], [5, 8], [5, 9],
    [5, 10], [5, 11], [6, 11], [7, 11], [8, 11], [8, 12], [8, 13],
  ],
};
