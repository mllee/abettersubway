// ui.js — A Better Subway, browser UI.
// Renders a 15×15 grid into #app, commuter cards into #commuters, and a
// status bar into #hud. Click a tile to place/remove rail. Hover a commuter
// card to highlight that commuter's path.

import { LEVEL_1 } from './level1.js';
import { createState, placeRail, removeRail, computeRoutes } from './mechanics.js';
import { VERSION, BUILD } from './version.js';

const level = LEVEL_1;
const state = createState(level);

const parkSet = new Set(level.parks.map(([x, y]) => `${x},${y}`));
const startMap = new Map();
const destMap = new Map();
for (const c of level.commuters) {
  startMap.set(`${c.start[0]},${c.start[1]}`, c.id);
  destMap.set(`${c.dest[0]},${c.dest[1]}`, c.id);
}

const app = document.getElementById('app');
const hud = document.getElementById('hud');
const cards = document.getElementById('commuters');

app.style.setProperty('--cols', level.width);
app.style.setProperty('--rows', level.height);

const tiles = new Map();
for (let y = 1; y <= level.height; y++) {
  for (let x = 1; x <= level.width; x++) {
    const k = `${x},${y}`;
    const div = document.createElement('div');
    div.className = 'tile';
    div.dataset.x = x;
    div.dataset.y = y;
    if (parkSet.has(k)) div.classList.add('park');
    let commuterId = null;
    if (startMap.has(k)) {
      commuterId = startMap.get(k);
      div.classList.add('start');
      div.dataset.commuter = commuterId;
      div.textContent = commuterId;
    } else if (destMap.has(k)) {
      commuterId = destMap.get(k);
      div.classList.add('dest');
      div.dataset.commuter = commuterId;
      div.textContent = commuterId.toLowerCase();
    }
    if (commuterId) {
      // Hover a commuter's start or dest tile to preview their path.
      div.addEventListener('mouseenter', () => {
        if (dragMode) return;
        highlightPath(commuterId);
      });
      div.addEventListener('mouseleave', () => {
        if (dragMode) return;
        highlightPath(null);
      });
    }
    app.appendChild(div);
    tiles.set(k, div);
  }
}

// Drag-to-paint. Uses pointer events on the grid container plus
// elementFromPoint to find the tile under the cursor, because on Chrome
// (Mac) a mousedown on a tile implicitly captures subsequent move events
// to that tile — mouseenter on siblings doesn't fire during a real drag.
let dragMode = null;       // 'place' | 'remove' | null
let lastDragKey = null;    // last "x,y" we acted on, to avoid double-apply

function tileFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el || !el.classList || !el.classList.contains('tile')) return null;
  return el;
}

function applyAt(el, isFirstPress) {
  const x = Number(el.dataset.x);
  const y = Number(el.dataset.y);
  const k = `${x},${y}`;
  if (k === lastDragKey) return false;
  lastDragKey = k;
  if (dragMode === 'place' && !state.rail.has(k)) {
    const res = placeRail(state, x, y);
    if (res.ok) return true;
    if (isFirstPress) flashReject(el, res.reason);
    return false;
  }
  if (dragMode === 'remove' && state.rail.has(k)) {
    removeRail(state, x, y);
    return true;
  }
  return false;
}

function onAppPointerDown(e) {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const el = e.target.closest && e.target.closest('.tile');
  if (!el) return;
  e.preventDefault();
  // Release implicit pointer capture so pointermove fires on siblings,
  // not just on the originating tile.
  if (e.target.releasePointerCapture) {
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
  }
  const x = Number(el.dataset.x);
  const y = Number(el.dataset.y);
  const k = `${x},${y}`;
  dragMode = state.rail.has(k) ? 'remove' : 'place';
  lastDragKey = null;
  if (applyAt(el, true)) render();
}

function onAppPointerMove(e) {
  if (!dragMode) return;
  const el = tileFromPoint(e.clientX, e.clientY);
  if (!el) return;
  if (applyAt(el, false)) render();
}

function endDrag() {
  dragMode = null;
  lastDragKey = null;
}

app.addEventListener('pointerdown', onAppPointerDown);
app.addEventListener('pointermove', onAppPointerMove);
window.addEventListener('pointerup', endDrag);
window.addEventListener('pointercancel', endDrag);
window.addEventListener('blur', endDrag);
// Prevent native drag of any descendant element (safety belt).
app.addEventListener('dragstart', (e) => e.preventDefault());

function clearAllRail() {
  if (state.rail.size === 0) return;
  state.rail.clear();
  render();
}

function flashReject(el, reason) {
  el.classList.add('reject');
  el.title = `cannot place: ${reason}`;
  setTimeout(() => el.classList.remove('reject'), 200);
}

function statusClass(time, deadline) {
  if (time === Infinity) return 'fail';
  if (time > deadline) return 'late';
  if (time > deadline - 2) return 'warn';
  return 'ok';
}

let currentRoutes = null;
let hovered = null;

function render() {
  currentRoutes = computeRoutes(state);

  for (const [k, el] of tiles) {
    if (state.rail.has(k)) el.classList.add('rail');
    else el.classList.remove('rail');
    el.classList.remove('path');
  }

  const onTime = currentRoutes.commuters.filter(c => c.time <= level.deadline).length;
  const total = currentRoutes.commuters.length;
  const worst = currentRoutes.worst;
  const worstStr = worst
    ? `${worst.id} ${worst.time === Infinity ? '∞' : worst.time.toFixed(1)} min`
    : '—';
  const medalText = currentRoutes.medal === 'fail'
    ? '✗ fail'
    : `🏅 ${currentRoutes.medal}`;
  hud.innerHTML = `
    <span class="hud-item"><b>${onTime}/${total}</b> on time</span>
    <span class="hud-item">Worst: <b>${worstStr}</b></span>
    <span class="hud-item">Rail: <b>${currentRoutes.railCount}</b> / ${level.hardCap}</span>
    <span class="hud-item">Gold ${level.gold} · Silver ${level.silver} · Bronze ${level.bronze}</span>
    <span class="hud-item medal medal-${currentRoutes.medal}">${medalText}</span>
    <button id="clear-btn" class="hud-btn" ${currentRoutes.railCount === 0 ? 'disabled' : ''}>Clear rail</button>
    <span class="hud-item version" title="Build ${BUILD}. If this number lags behind GitHub, Pages hasn't redeployed yet — hard-refresh.">v${VERSION}</span>
  `;
  document.getElementById('clear-btn').addEventListener('click', clearAllRail);

  cards.innerHTML = '';
  for (const c of currentRoutes.commuters) {
    const card = document.createElement('div');
    const sc = statusClass(c.time, level.deadline);
    card.className = `card status-${sc}`;
    card.dataset.commuter = c.id;
    const timeStr = c.time === Infinity ? 'no path' : `${c.time.toFixed(1)} min`;
    const overBy = c.time > level.deadline && c.time !== Infinity
      ? ` (late by ${(c.time - level.deadline).toFixed(1)})`
      : c.time <= level.deadline ? ' ✓' : '';
    card.innerHTML = `
      <span class="card-id">${c.id} → ${c.id.toLowerCase()}</span>
      <span class="card-time">${timeStr}${overBy}</span>
    `;
    card.addEventListener('mouseenter', () => highlightPath(c.id));
    card.addEventListener('mouseleave', () => highlightPath(null));
    cards.appendChild(card);
  }

  if (hovered) highlightPath(hovered);
}

function highlightPath(id) {
  hovered = id;
  for (const el of tiles.values()) el.classList.remove('path');
  if (!id || !currentRoutes) return;
  const c = currentRoutes.commuters.find(c => c.id === id);
  if (!c) return;
  for (const [x, y] of c.path) {
    const el = tiles.get(`${x},${y}`);
    if (el) el.classList.add('path');
  }
}

render();
