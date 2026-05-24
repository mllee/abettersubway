// levels.js — central registry of playable levels.
//
// The active level is stored in localStorage so prev/next can swap by
// reloading the page (avoids refactoring ui.js's grid-build code into a
// re-runnable function). One source of truth for which level loads.

import { LEVEL_1 } from './level1.js';
import { LEVEL_2 } from './level2.js';

export const LEVELS = [
  { id: 'sf',  name: 'San Francisco',  data: LEVEL_1 },
  { id: 'nyc', name: 'New York City',  data: LEVEL_2 },
];

const STORAGE_KEY = 'abs-active-level';

export function getActiveLevelIndex() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const n = raw === null ? 0 : parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n >= LEVELS.length) return 0;
  return n;
}

export function setActiveLevelIndex(i) {
  if (!Number.isFinite(i) || i < 0 || i >= LEVELS.length) return;
  localStorage.setItem(STORAGE_KEY, String(i));
}

export function getActiveLevel() {
  return LEVELS[getActiveLevelIndex()];
}
