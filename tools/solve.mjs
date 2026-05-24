#!/usr/bin/env node
// tools/solve.mjs — minimum-rail solver for A Better Subway levels.
//
// Multi-start hillclimb. Each trial:
//   1. greedy add — repeatedly place the tile that most reduces max
//      commute time (tiebreak: sum of times, then random) until allPass.
//   2. trim       — remove any tile we can without breaking allPass.
//   3. perturb    — every few trials, restart from the current best with
//      a few random tiles removed, so we explore neighborhoods of good
//      solutions instead of just rolling fresh dice every time.
//
// Not provably optimal. But: if 30 trials all converge to the same tile
// count, you can be highly confident it's at or near the true optimum.
//
// Usage:
//   node tools/solve.mjs                       # solve level1 (default)
//   node tools/solve.mjs level2.js             # solve a specific level
//   node tools/solve.mjs level1.js --trials=50 # more trials
//   node tools/solve.mjs --verbose             # per-trial progress
//
// Output: JSON `{tiles, coords}` to stdout, log lines to stderr. Paste
// the coords into `LEVEL_N.goldSolution` in the matching level file.

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith('--'));
const levelFile = positional[0] ?? 'level1.js';
const TRIALS = +(args.find((a) => a.startsWith('--trials='))?.split('=')[1] ?? 30);
const VERBOSE = args.includes('--verbose');

const levelMod = await import(resolve(REPO_ROOT, levelFile));
const levelEntry = Object.entries(levelMod).find(([k]) => /^LEVEL_/.test(k));
if (!levelEntry) {
  console.error(`No LEVEL_* export in ${levelFile}`);
  process.exit(1);
}
const LEVEL = levelEntry[1];
const LEVEL_NAME = levelEntry[0];

const { createState, placeRail, removeRail, computeRoutes } =
  await import(resolve(REPO_ROOT, 'mechanics.js'));

// ---------- Helpers ----------

function score(state) {
  const r = computeRoutes(state);
  let maxT = -Infinity, sumT = 0;
  for (const c of r.commuters) {
    const t = Number.isFinite(c.time) ? c.time : 1e6;
    if (t > maxT) maxT = t;
    sumT += t;
  }
  return { allPass: r.allPass, rail: r.railCount, maxT, sumT };
}

function listCandidates(state) {
  const out = [];
  for (let y = 1; y <= LEVEL.height; y++) {
    for (let x = 1; x <= LEVEL.width; x++) {
      if (state.rail.has(`${x},${y}`)) continue;
      const res = placeRail(state, x, y);
      if (res.ok) { removeRail(state, x, y); out.push([x, y]); }
    }
  }
  return out;
}

// Mulberry32 — seeded PRNG so trials are reproducible.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- Solver phases ----------

function greedyAdd(state, rand) {
  while (!score(state).allPass) {
    const cands = shuffle(listCandidates(state), rand);
    if (!cands.length) return false; // no legal moves and still not passing
    let best = null;
    for (const [x, y] of cands) {
      placeRail(state, x, y);
      const s = score(state);
      removeRail(state, x, y);
      if (!best
          || s.maxT < best.s.maxT
          || (s.maxT === best.s.maxT && s.sumT < best.s.sumT)) {
        best = { x, y, s };
      }
    }
    placeRail(state, best.x, best.y);
  }
  return true;
}

function trim(state, rand) {
  let removed = true;
  while (removed) {
    removed = false;
    const placed = shuffle([...state.rail].map((k) => k.split(',').map(Number)), rand);
    for (const [x, y] of placed) {
      removeRail(state, x, y);
      if (score(state).allPass) removed = true;
      else placeRail(state, x, y);
    }
  }
}

function cloneRail(state) { return new Set(state.rail); }
function setRail(state, set) {
  state.rail.clear();
  for (const k of set) state.rail.add(k);
}

function solveTrial(seed, perturbFromRail = null, perturbK = 0) {
  const rand = rng(seed);
  const state = createState(LEVEL);
  if (perturbFromRail) {
    // Start from the perturbed set: keep most of best's tiles, drop K random ones.
    const placed = shuffle([...perturbFromRail], rand);
    for (const k of placed.slice(perturbK)) state.rail.add(k);
  }
  const ok = greedyAdd(state, rand);
  if (!ok) return null;
  trim(state, rand);
  return state;
}

// ---------- Multi-start loop ----------

const t0 = Date.now();
let best = null;
let bestSeed = null;

for (let t = 0; t < TRIALS; t++) {
  const seed = 1000 + t;
  // Every 3rd trial, restart cold. Otherwise perturb the current best.
  const perturb = (best && t % 3 !== 0)
    ? { rail: cloneRail(best.state), k: 3 + (t % 4) } // remove 3..6 tiles
    : null;
  const state = perturb
    ? solveTrial(seed, perturb.rail, perturb.k)
    : solveTrial(seed);
  if (!state) continue;
  const s = score(state);
  if (VERBOSE) {
    console.error(
      `trial ${String(t + 1).padStart(2)}/${TRIALS}  seed=${seed}  ` +
      `tiles=${s.rail}  pass=${s.allPass}  ${perturb ? `[perturb -${perturb.k}]` : '[cold]'}`,
    );
  }
  if (!best || (s.allPass && (!best.s.allPass || s.rail < best.s.rail))) {
    best = { state, s };
    bestSeed = seed;
  }
}

if (!best) {
  console.error('No solution found.');
  process.exit(2);
}

const coords = [...best.state.rail]
  .map((k) => k.split(',').map(Number))
  .sort(([ax, ay], [bx, by]) => ay - by || ax - bx);

const dt = Date.now() - t0;
console.error(
  `${LEVEL_NAME}: best ${coords.length} tiles ` +
  `(seed ${bestSeed}, ${TRIALS} trials, ${dt}ms)  ` +
  `gold target = ${LEVEL.gold}`,
);

console.log(JSON.stringify({ level: LEVEL_NAME, tiles: coords.length, coords }, null, 2));
