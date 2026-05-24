// level1.js — A Better Subway, Level 1 data ("Four Trips, One Shortcut")
// Owner: Lane B. Data only — no logic.
//
// Coordinates are [x, y] where x = column (1-indexed, left-to-right) and
// y = row (1-indexed, top-to-bottom).

/** @type {import('./mechanics.js').Level} */
export const LEVEL_1 = {
  width: 15,
  height: 15,

  // Central park box. Hollow interior is unreachable (walled in), so it
  // functions as a single obstacle that forces all four commuters to route
  // around it. Parks block rail placement; commuters could walk through
  // them, but the box has no interior path so it acts as a solid obstacle.
  parks: [
    [6, 5],  [7, 5],  [8, 5],  [9, 5],  [10, 5],
    [6, 6],  [7, 6],  [8, 6],  [9, 6],  [10, 6],
    [6, 7],                                       [10, 7],
    [6, 8],                                       [10, 8],
    [6, 9],                                       [10, 9],
    [6, 10], [7, 10], [8, 10], [9, 10], [10, 10],
    [6, 11], [7, 11], [8, 11], [9, 11], [10, 11],
  ],

  // Four commuters routed around the central obstacle.
  // A & B share a diagonal across the top; C goes horizontally; D vertically.
  commuters: [
    { id: 'A', start: [2, 4],   dest: [14, 12] },
    { id: 'B', start: [14, 4],  dest: [2, 12]  },
    { id: 'C', start: [2, 8],   dest: [14, 8]  },
    { id: 'D', start: [8, 14],  dest: [8, 2]   },
  ],

  hardCap: 22,
  gold:    18,
  silver:  20,
  bronze:  22,
  deadline: 22.0,

  walkCost: 2.0,
  railCost: 0.5,
};

// Walking-only baseline (zero rail), with parks now impassable:
//   A -> a : 40 min
//   B -> b : 40 min
//   C -> c : 40 min  (was 24; park box forces a long N/S detour)
//   D -> d : 36 min  (was 24; same reason)
//
// All four are well over the 22-min deadline, so all four need rail.
//
// Known optimum (multi-start search, 60 kicks): 18 rails. Sample gold:
//   row 4 corridor:  (3,4)..(13,4)   -- shared by A and B (11 tiles)
//   col 5 ladder:    (5,5)..(5,9)    -- lifts C and D up to the corridor
//   right shoulders: (13,5), (8,3)   -- B exit + D top dab
//
// Greedy lands at ~19; the optimum requires seeing that one column on the
// west side of the park box services both C and D into the row-4 corridor.
