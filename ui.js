// ui.js — A Better Subway, UI layer.
//
// Renders the 15x15 board, the HUD, and the side panel. Click an open tile
// to place a rail; click a rail to remove it. Click-and-drag paints a
// continuous strip in the same mode as the first tile. The Clear button
// wipes all placed rail.

import { LEVEL_1 } from './level1.js';
import {
  createState,
  placeRail,
  removeRail,
  computeRoutes,
} from './mechanics.js';
import { VERSION, BUILD } from './version.js';

const hud = document.getElementById('hud');
const app = document.getElementById('app');
const sideEl = document.getElementById('commuters');

const state = createState(LEVEL_1);

// Each commuter has a distinct sprite + destination type so the board
// reads like a small town instead of four abstract letters.
const COMMUTER_META = {
  A: { destType: 'office', destLabel: 'office' },
  B: { destType: 'school', destLabel: 'school' },
  C: { destType: 'shop',   destLabel: 'shop'   },
  D: { destType: 'clinic', destLabel: 'clinic' },
};

// ---------- SVG pixel sprites ----------

const SVG_NS = 'http://www.w3.org/2000/svg';

function makeSprite(viewBox, rects, klass) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('class', `sprite-svg ${klass || ''}`.trim());
  for (const [x, y, w, h, fill] of rects) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w);
    r.setAttribute('height', h);
    r.setAttribute('fill', fill);
    svg.appendChild(r);
  }
  return svg;
}

function treeSprite() {
  return makeSprite('0 0 16 16', [
    // crown outline (dark)
    [4, 1, 8, 1, '#1d4a1d'],
    [3, 2, 10, 1, '#1d4a1d'],
    [2, 3, 12, 1, '#1d4a1d'],
    [2, 4, 12, 1, '#1d4a1d'],
    [2, 5, 12, 1, '#1d4a1d'],
    [3, 6, 10, 1, '#1d4a1d'],
    [3, 7, 10, 1, '#1d4a1d'],
    [4, 8, 8, 1, '#1d4a1d'],
    // crown fill (mid green)
    [5, 2, 6, 1, '#2d6a2d'],
    [4, 3, 8, 1, '#2d6a2d'],
    [3, 4, 9, 1, '#2d6a2d'],
    [4, 5, 8, 1, '#2d6a2d'],
    [4, 6, 8, 1, '#2d6a2d'],
    [5, 7, 6, 1, '#2d6a2d'],
    // highlights
    [5, 3, 2, 1, '#4ea34e'],
    [9, 3, 2, 1, '#4ea34e'],
    [4, 4, 2, 1, '#4ea34e'],
    // trunk
    [7, 9, 2, 4, '#5a3a1a'],
    [6, 12, 4, 2, '#5a3a1a'],
    // trunk shadow
    [9, 9, 1, 4, '#3a2010'],
    [8, 13, 2, 1, '#3a2010'],
  ], 'tree');
}

function personSprite(id) {
  // Each commuter gets a distinct outfit palette.
  const palette = {
    A: { hair: '#3a2010', skin: '#f5c89a', shirt: '#c84a3a', pants: '#3a3a5a', shoe: '#1a1a1a' }, // brown hair, red shirt
    B: { hair: '#daa520', skin: '#ffd5b5', shirt: '#3a6fb5', pants: '#3a3a5a', shoe: '#1a1a1a' }, // blonde, blue shirt
    C: { hair: '#5a3a1a', skin: '#f5c89a', shirt: '#e5b223', pants: '#5a3a1a', shoe: '#3a2010' }, // kid, yellow shirt
    D: { hair: '#cccccc', skin: '#f5d5b5', shirt: '#8a4a9a', pants: '#4a3a2a', shoe: '#3a2010' }, // gray hair, purple
  }[id];

  return makeSprite('0 0 16 18', [
    // hair (top + sides)
    [5, 0, 6, 1, palette.hair],
    [4, 1, 8, 2, palette.hair],
    [4, 3, 1, 2, palette.hair],
    [11, 3, 1, 2, palette.hair],
    // face
    [5, 3, 6, 4, palette.skin],
    // eyes
    [6, 5, 1, 1, '#000000'],
    [9, 5, 1, 1, '#000000'],
    // neck
    [7, 7, 2, 1, palette.skin],
    // shirt body
    [4, 8, 8, 4, palette.shirt],
    // arms
    [3, 8, 1, 4, palette.shirt],
    [12, 8, 1, 4, palette.shirt],
    // hands
    [3, 12, 1, 1, palette.skin],
    [12, 12, 1, 1, palette.skin],
    // shirt shadow
    [4, 11, 8, 1, '#00000040'],
    // pants
    [5, 12, 2, 4, palette.pants],
    [9, 12, 2, 4, palette.pants],
    // shoes
    [4, 16, 3, 1, palette.shoe],
    [9, 16, 3, 1, palette.shoe],
  ], `person person-${id}`);
}

function buildingSprite(type) {
  if (type === 'office') {
    // Tall blue-gray office tower with grid of lit windows
    return makeSprite('0 0 16 18', [
      // roof cap
      [2, 1, 12, 1, '#3a4258'],
      [2, 2, 12, 1, '#3a4258'],
      // body
      [2, 3, 12, 13, '#7c89a8'],
      // body shading
      [13, 3, 1, 13, '#5a6680'],
      [2, 15, 12, 1, '#5a6680'],
      // windows (3 cols x 3 rows)
      [3, 4, 2, 2, '#ffe066'],
      [7, 4, 2, 2, '#ffe066'],
      [11, 4, 2, 2, '#ffe066'],
      [3, 7, 2, 2, '#ffe066'],
      [7, 7, 2, 2, '#ffd54f'],
      [11, 7, 2, 2, '#ffe066'],
      [3, 10, 2, 2, '#ffe066'],
      [7, 10, 2, 2, '#ffe066'],
      [11, 10, 2, 2, '#ffe066'],
      // door
      [7, 13, 2, 3, '#3a2010'],
      [7, 13, 2, 1, '#1a1008'],
      // ground line
      [1, 16, 14, 1, '#5a4a3a'],
    ], 'building office');
  }
  if (type === 'school') {
    // Red brick school with a bell tower on top
    return makeSprite('0 0 16 18', [
      // bell tower
      [7, 0, 2, 2, '#aaaaaa'],
      [6, 2, 4, 1, '#5a3a2a'],
      // roof
      [3, 3, 10, 1, '#5a3a2a'],
      [2, 4, 12, 1, '#7a4a32'],
      // body
      [2, 5, 12, 11, '#c4523a'],
      // brick courses (darker lines)
      [2, 8, 12, 1, '#9a3a28'],
      [2, 12, 12, 1, '#9a3a28'],
      // windows
      [4, 6, 2, 2, '#cce0ff'],
      [10, 6, 2, 2, '#cce0ff'],
      [4, 9, 2, 2, '#cce0ff'],
      [10, 9, 2, 2, '#cce0ff'],
      // door (arched look)
      [7, 12, 2, 4, '#3a2010'],
      [6, 13, 1, 3, '#3a2010'],
      [9, 13, 1, 3, '#3a2010'],
      // ground
      [1, 16, 14, 1, '#5a4a3a'],
    ], 'building school');
  }
  if (type === 'shop') {
    // Storefront with a striped green awning
    return makeSprite('0 0 16 18', [
      // sign
      [3, 1, 10, 2, '#d8c890'],
      [3, 1, 10, 1, '#a89860'],
      // awning base
      [2, 3, 12, 2, '#3a6a4a'],
      [2, 4, 12, 1, '#2a5038'],
      // awning stripes
      [3, 3, 1, 2, '#5fb88a'],
      [6, 3, 1, 2, '#5fb88a'],
      [9, 3, 1, 2, '#5fb88a'],
      [12, 3, 1, 2, '#5fb88a'],
      // body
      [2, 5, 12, 11, '#e6d6a8'],
      [13, 5, 1, 11, '#b89868'],
      // big display window
      [3, 6, 10, 6, '#a8c8e0'],
      [3, 6, 10, 1, '#5a7088'],
      [3, 11, 10, 1, '#5a7088'],
      [3, 6, 1, 6, '#5a7088'],
      [12, 6, 1, 6, '#5a7088'],
      // door
      [7, 12, 2, 4, '#5a3a1a'],
      // doorknob
      [8, 14, 1, 1, '#e5b223'],
      // ground
      [1, 16, 14, 1, '#5a4a3a'],
    ], 'building shop');
  }
  if (type === 'clinic') {
    // White clinic with red cross
    return makeSprite('0 0 16 18', [
      // roof
      [2, 2, 12, 1, '#c44a3a'],
      [3, 3, 10, 1, '#c44a3a'],
      // body white
      [2, 4, 12, 12, '#f0f0f0'],
      [13, 4, 1, 12, '#c0c0c0'],
      [2, 15, 12, 1, '#c0c0c0'],
      // red cross (medical)
      [7, 5, 2, 4, '#d04a3a'],
      [6, 6, 4, 2, '#d04a3a'],
      // windows
      [3, 10, 2, 2, '#a8c8e0'],
      [11, 10, 2, 2, '#a8c8e0'],
      // door
      [7, 12, 2, 4, '#5a3a1a'],
      [8, 14, 1, 1, '#e5b223'],
      // ground
      [1, 16, 14, 1, '#5a4a3a'],
    ], 'building clinic');
  }
  // Fallback
  return makeSprite('0 0 16 18', [[2, 2, 12, 14, '#888888']], 'building');
}

// ---------- Grid build ----------

const parkSet = new Set(LEVEL_1.parks.map(([x, y]) => `${x},${y}`));
const startByKey = new Map();
const destByKey = new Map();
for (const c of LEVEL_1.commuters) {
  startByKey.set(`${c.start[0]},${c.start[1]}`, c.id);
  destByKey.set(`${c.dest[0]},${c.dest[1]}`, c.id.toLowerCase());
}

const tileByKey = new Map();
const personTileById = new Map();
const timeBadgeById = new Map();

app.style.setProperty('--cols', LEVEL_1.width);
app.style.setProperty('--rows', LEVEL_1.height);
app.innerHTML = '';

for (let y = 1; y <= LEVEL_1.height; y++) {
  for (let x = 1; x <= LEVEL_1.width; x++) {
    const k = `${x},${y}`;
    const div = document.createElement('div');
    div.className = 'tile';
    div.dataset.x = String(x);
    div.dataset.y = String(y);

    if (parkSet.has(k)) {
      div.classList.add('park');
      div.appendChild(treeSprite());
    } else if (startByKey.has(k)) {
      const id = startByKey.get(k);
      div.classList.add('start', `start-${id}`);
      div.dataset.commuter = id;
      div.appendChild(personSprite(id));

      const badge = document.createElement('span');
      badge.className = 'time-badge';
      badge.dataset.id = id;
      badge.textContent = '--';
      div.appendChild(badge);

      personTileById.set(id, div);
      timeBadgeById.set(id, badge);

      div.addEventListener('mouseenter', () => {
        if (dragMode) return; // don't strobe the highlight while painting
        highlightCommuter(id);
      });
      div.addEventListener('mouseleave', () => {
        if (dragMode) return;
        clearHighlight();
      });
    } else if (destByKey.has(k)) {
      const lower = destByKey.get(k);
      const upper = lower.toUpperCase();
      const meta = COMMUTER_META[upper];
      div.classList.add('dest', `dest-${lower}`);
      div.dataset.commuter = upper;
      div.appendChild(buildingSprite(meta.destType));

      div.addEventListener('mouseenter', () => {
        if (dragMode) return;
        highlightCommuter(upper);
      });
      div.addEventListener('mouseleave', () => {
        if (dragMode) return;
        clearHighlight();
      });
    }

    app.appendChild(div);
    tileByKey.set(k, div);
  }
}

// Drag-to-paint using pointer events on the grid container plus
// elementFromPoint. mouseenter on sibling tiles doesn't fire reliably
// during a real drag on Chrome/Mac, so we delegate at the #app level.
let currentRoutes = null;
let lastAllPass = false;
let dragMode = null;       // 'place' | 'remove' | null
let lastDragKey = null;    // last "x,y" we acted on, to avoid double-apply

function tileFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  if (!el) return null;
  // Could be the sprite-svg or time-badge inside a tile — climb to the tile.
  return el.closest('.tile');
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
    if (isFirstPress) {
      el.classList.remove('reject');
      void el.offsetWidth;
      el.classList.add('reject');
      setTimeout(() => el.classList.remove('reject'), 320);
    }
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
  // Release implicit pointer capture so pointermove fires on sibling tiles,
  // not just on the originating tile.
  if (e.target.releasePointerCapture) {
    try { e.target.releasePointerCapture(e.pointerId); } catch {}
  }
  const x = Number(el.dataset.x);
  const y = Number(el.dataset.y);
  const k = `${x},${y}`;
  dragMode = state.rail.has(k) ? 'remove' : 'place';
  lastDragKey = null;
  clearTileHighlights();
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
app.addEventListener('dragstart', (e) => e.preventDefault());

function clearAllRail() {
  if (state.rail.size === 0) return;
  state.rail.clear();
  render();
}

function render() {
  currentRoutes = computeRoutes(state);

  for (const [k, el] of tileByKey) {
    el.classList.toggle('rail', state.rail.has(k));
  }

  for (const c of currentRoutes.commuters) {
    const status = statusFor(c.time);
    const badge = timeBadgeById.get(c.id);
    if (badge) {
      badge.textContent = Number.isFinite(c.time) ? Math.round(c.time) : '∞';
      badge.dataset.status = status;
    }
    const tile = personTileById.get(c.id);
    if (tile) tile.dataset.status = status;
  }

  renderHud(currentRoutes);
  renderCommuterList();

  // Success modal: trigger once per false→true transition of allPass.
  if (currentRoutes.allPass && !lastAllPass) {
    showSuccessModal(currentRoutes);
  }
  lastAllPass = currentRoutes.allPass;
}

function renderHud(r) {
  const onTime = r.commuters.filter((c) => c.time <= LEVEL_1.deadline).length;
  const total = r.commuters.length;
  hud.innerHTML = '';

  const title = document.createElement('span');
  title.className = 'hud-title';
  title.textContent = 'A BETTER SUBWAY';
  hud.appendChild(title);

  const parts = [
    `${onTime}/${total} on time`,
    `Rail ${r.railCount}/${LEVEL_1.hardCap}`,
    `Gold ${LEVEL_1.gold}`,
    `Medal: ${r.medal.toUpperCase()}`,
  ];

  parts.forEach((p) => {
    const sep = document.createElement('span');
    sep.className = 'hud-sep';
    sep.textContent = '·';
    hud.appendChild(sep);

    const span = document.createElement('span');
    span.className = 'hud-item';
    if (p.startsWith('Medal')) span.dataset.medal = r.medal;
    span.textContent = p;
    hud.appendChild(span);
  });

  const clearBtn = document.createElement('button');
  clearBtn.className = 'hud-btn';
  clearBtn.textContent = 'CLEAR RAIL';
  clearBtn.disabled = r.railCount === 0;
  clearBtn.addEventListener('click', clearAllRail);
  hud.appendChild(clearBtn);

  const ver = document.createElement('span');
  ver.className = 'hud-version';
  ver.title = `Build ${BUILD}. If this number lags behind GitHub, Pages hasn't redeployed yet — hard-refresh.`;
  ver.textContent = `v${VERSION}`;
  hud.appendChild(ver);

  hud.dataset.medal = r.medal;
}

function formatTime(t) {
  if (!Number.isFinite(t)) return '∞';
  return `${t.toFixed(1)} min`;
}

function statusFor(time) {
  const d = LEVEL_1.deadline;
  if (!Number.isFinite(time) || time > d) return 'red';
  if (time > d - 2) return 'yellow'; // within 2 min of deadline
  return 'green';
}

// ---------- Sidebar ----------

function renderCommuterList() {
  sideEl.innerHTML = '';
  sideEl.classList.remove('detail');

  const title = document.createElement('div');
  title.className = 'side-title';
  title.textContent = 'COMMUTERS';
  sideEl.appendChild(title);

  if (!currentRoutes) return;

  const list = document.createElement('div');
  list.className = 'commuter-list';

  for (const c of currentRoutes.commuters) {
    const meta = COMMUTER_META[c.id];
    const status = statusFor(c.time);

    const row = document.createElement('div');
    row.className = 'commuter-row';
    row.dataset.id = c.id;
    row.dataset.status = status;

    const swatch = document.createElement('span');
    swatch.className = 'cr-swatch';
    swatch.appendChild(personSprite(c.id));

    const info = document.createElement('div');
    info.className = 'cr-info';
    const name = document.createElement('div');
    name.className = 'cr-name';
    name.textContent = `Commuter ${c.id}`;
    const dest = document.createElement('div');
    dest.className = 'cr-dest';
    dest.textContent = `→ ${meta.destLabel}`;
    info.appendChild(name);
    info.appendChild(dest);

    const time = document.createElement('div');
    time.className = 'cr-time';
    time.textContent = formatTime(c.time);

    row.appendChild(swatch);
    row.appendChild(info);
    row.appendChild(time);

    row.addEventListener('mouseenter', () => {
      if (dragMode) return;
      highlightCommuter(c.id);
    });
    row.addEventListener('mouseleave', () => {
      if (dragMode) return;
      // Don't re-render the list (it's already there) — just drop the
      // hover state + tile highlights.
      clearTileHighlights();
      for (const r of sideEl.querySelectorAll('.commuter-row')) {
        r.classList.remove('active');
      }
    });
    list.appendChild(row);
  }
  sideEl.appendChild(list);

  const hint = document.createElement('div');
  hint.className = 'side-hint';
  hint.textContent = 'Hover a row (or a person on the grid) to see their route.';
  sideEl.appendChild(hint);
}

function highlightCommuter(id) {
  if (!currentRoutes) return;
  const c = currentRoutes.commuters.find((x) => x.id === id);
  if (!c) return;
  clearTileHighlights();
  for (const [x, y] of c.path) {
    const el = tileByKey.get(`${x},${y}`);
    if (el) el.classList.add('highlight');
  }
  // Mark the matching sidebar row as active.
  for (const row of sideEl.querySelectorAll('.commuter-row')) {
    row.classList.toggle('active', row.dataset.id === id);
  }
}

function clearHighlight() {
  clearTileHighlights();
  for (const row of sideEl.querySelectorAll('.commuter-row')) {
    row.classList.remove('active');
  }
}

function clearTileHighlights() {
  for (const el of tileByKey.values()) el.classList.remove('highlight');
}

// ---------- Success modal ----------

function showSuccessModal(r) {
  const existing = document.getElementById('success-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'success-modal';
  backdrop.dataset.medal = r.medal;

  const modal = document.createElement('div');
  modal.className = 'success-modal';
  modal.dataset.medal = r.medal;

  const medalWrap = document.createElement('div');
  medalWrap.className = 'medal-wrap';

  const medalIcon = document.createElement('div');
  medalIcon.className = 'medal-icon';
  medalIcon.dataset.medal = r.medal;
  medalIcon.textContent = '★';
  medalWrap.appendChild(medalIcon);

  const stars = document.createElement('div');
  stars.className = 'medal-stars';
  const starCount = r.medal === 'gold' ? 3 : r.medal === 'silver' ? 2 : 1;
  stars.textContent = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);
  medalWrap.appendChild(stars);

  const medalLabel = document.createElement('div');
  medalLabel.className = 'medal-label';
  medalLabel.dataset.medal = r.medal;
  medalLabel.textContent = r.medal.toUpperCase();
  medalWrap.appendChild(medalLabel);

  modal.appendChild(medalWrap);

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = 'EVERYONE ON TIME!';
  modal.appendChild(title);

  const scoreBlock = document.createElement('div');
  scoreBlock.className = 'modal-scores';

  const yourRow = document.createElement('div');
  yourRow.className = 'score-row your-row';
  yourRow.innerHTML = `
    <span class="score-label">YOUR SOLUTION</span>
    <span class="score-num">${r.railCount}</span>
    <span class="score-unit">rail tiles</span>
  `;

  const bestRow = document.createElement('div');
  bestRow.className = 'score-row best-row';
  bestRow.innerHTML = `
    <span class="score-label">BEST KNOWN</span>
    <span class="score-num">${LEVEL_1.gold}</span>
    <span class="score-unit">rail tiles</span>
  `;

  scoreBlock.appendChild(yourRow);
  scoreBlock.appendChild(bestRow);
  modal.appendChild(scoreBlock);

  const message = document.createElement('div');
  message.className = 'modal-message';
  message.textContent = messageForResult(r);
  modal.appendChild(message);

  const btn = document.createElement('button');
  btn.className = 'modal-btn';
  btn.textContent = 'KEEP PLAYING';
  btn.addEventListener('click', () => backdrop.remove());
  modal.appendChild(btn);

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) backdrop.remove();
  });
  document.addEventListener('keydown', escClose);
  function escClose(e) {
    if (e.key === 'Escape') {
      backdrop.remove();
      document.removeEventListener('keydown', escClose);
    }
  }

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function messageForResult(r) {
  const gold = LEVEL_1.gold;
  const delta = r.railCount - gold;
  if (r.medal === 'gold') return 'Maximum optimization. You found the shared corridor.';
  if (r.medal === 'silver') return `Solid. ${delta} tile${delta === 1 ? '' : 's'} above the gold solution — can you trim further?`;
  return `Solved. ${delta} tiles above gold. There's a much shorter solution hiding in there.`;
}

render();
