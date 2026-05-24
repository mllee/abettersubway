// level1.js — A Better Subway, Level 1 data ("San Francisco")
// Owner: Lane B. Data only — no logic.
//
// Coordinates are [x, y] where x = column (1-indexed, left-to-right) and
// y = row (1-indexed, top-to-bottom).
//
// Stylized SF: a small Bay pocket bites into the NE corner (the Financial
// District / Embarcadero edge). The rest of the Bay is suggested by an
// off-grid ocean background painted on the body — there's no point in
// using playable grid tiles for water that nobody can build through.
// Inside the playable city: Golden Gate Park + Panhandle in the western
// neighborhoods, Twin Peaks (with Mt Sutro) as a central hill, Mission
// Dolores Park in the Mission. Not to scale; Ocean Beach is cut off
// the west edge.

// Water tiles — a triangular bay pocket in the NE corner only. The rest
// of "the Bay" lives outside the playable grid as decoration.
const WATER = [
  [13, 1], [14, 1], [15, 1], [16, 1],
           [14, 2], [15, 2], [16, 2],
                    [15, 3], [16, 3],
                             [16, 4],
];

// Hills — Twin Peaks + Mt Sutro shoulder. Impassable; rail can't tunnel.
const HILLS = [
  [7, 8],  [8, 8],
  [7, 9],  [8, 9],  [9, 9],
  [7, 10], [8, 10], [9, 10],
  [8, 11],
];

// Green parks — Golden Gate Park, the Panhandle, Mission Dolores Park.
const GREEN_PARKS = [
  // Golden Gate Park (the big rectangle, west-central).
  [3, 6], [4, 6], [5, 6], [6, 6],
  [3, 7], [4, 7], [5, 7], [6, 7],
  // The Panhandle (narrow grass strip extending east from GGP).
  [7, 7], [8, 7], [9, 7],
  // Mission Dolores Park.
  [11, 11], [12, 11],
  [11, 12], [12, 12],
];

/** @type {import('./mechanics.js').Level} */
export const LEVEL_1 = {
  width: 16,
  height: 16,

  // `parks` is what mechanics.js reads — every impassable tile, whether
  // it's water, a hill, or actual grass. The UI splits them back out
  // via the `water`/`hills`/`greenParks` fields below to render distinct
  // sprites.
  parks: [...WATER, ...HILLS, ...GREEN_PARKS],
  water: WATER,
  hills: HILLS,
  greenParks: GREEN_PARKS,

  // Four commuters routed across the SF map.
  //   A: Sunset (SW)        → Financial District (NE, just inland of bay pocket)
  //   B: Outer Mission (S)  → North Beach (N)
  //   C: Outer Richmond (W) → SOMA (E)            — blocked by Twin Peaks
  //   D: Bayview (SE)       → Chinatown (NE)      — must skirt Dolores Park
  commuters: [
    { id: 'A', start: [3, 15],  dest: [12, 3] },
    { id: 'B', start: [8, 15],  dest: [9, 2]  },
    { id: 'C', start: [2, 8],   dest: [13, 8] },
    { id: 'D', start: [13, 14], dest: [12, 4] },
  ],

  // Starting tiers — first-pass guesses, expect to retune from playtest.
  hardCap: 28,
  gold:    20,
  silver:  24,
  bronze:  28,
  deadline: 22.0,

  walkCost: 2.0,
  railCost: 0.5,
};
