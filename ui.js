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
// #commuters is hidden in CSS — we use a floating hover-card now instead.
const hoverCard = document.createElement('div');
hoverCard.className = 'hover-card';
hoverCard.style.display = 'none';
document.body.appendChild(hoverCard);

const state = createState(LEVEL_1);

// Per-commuter palette. The same color drives the person's shirt, the
// destination building's walls, both tile frames, and the sidebar row —
// so who-goes-where reads at a glance. Kept in sync with --commuter-*
// CSS vars in styles.css.
const COMMUTER_META = {
  A: { destLabel: 'work', wall: '#c84a3a', roofDark: '#7a2418', roofLight: '#e36655' },
  B: { destLabel: 'work', wall: '#3a6fb5', roofDark: '#1a3a78', roofLight: '#5e92d5' },
  C: { destLabel: 'work', wall: '#2a9d8f', roofDark: '#10665a', roofLight: '#4ec0b0' },
  D: { destLabel: 'work', wall: '#8a4a9a', roofDark: '#4a1a5c', roofLight: '#aa6ab8' },
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
  // Shirt color matches the commuter's accent so the eye can pair person
  // with destination building (which also wears that color).
  const palette = {
    A: { hair: '#3a2010', skin: '#f5c89a', shirt: '#c84a3a', pants: '#3a3a5a', shoe: '#1a1a1a' },
    B: { hair: '#daa520', skin: '#ffd5b5', shirt: '#3a6fb5', pants: '#3a3a5a', shoe: '#1a1a1a' },
    C: { hair: '#5a3a1a', skin: '#f5c89a', shirt: '#2a9d8f', pants: '#5a3a1a', shoe: '#3a2010' },
    D: { hair: '#cccccc', skin: '#f5d5b5', shirt: '#8a4a9a', pants: '#4a3a2a', shoe: '#3a2010' },
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

function buildingSprite(id) {
  // One generic "work building" shape, recolored by commuter. Pitched
  // roof + body + windows + door. Recognizable at 34px and unmistakable
  // when paired with the matching shirt color across the board.
  const meta = COMMUTER_META[id];
  if (!meta) {
    return makeSprite('0 0 16 18', [[2, 2, 12, 14, '#888888']], 'building');
  }
  const { wall, roofDark, roofLight } = meta;
  return makeSprite('0 0 16 18', [
    // pitched roof (3 tiers, light on top, darker as it widens)
    [6, 1, 4, 1, roofDark],
    [5, 2, 6, 1, roofLight],
    [4, 3, 8, 1, roofLight],
    [3, 4, 10, 1, roofDark],
    // chimney
    [11, 1, 2, 2, roofDark],
    // body walls
    [3, 5, 10, 11, wall],
    // shading on right + bottom edges
    [12, 5, 1, 11, roofDark],
    [3, 15, 10, 1, roofDark],
    // windows (2 lit yellow squares with a sash cross)
    [4, 6, 3, 3, '#ffe066'],
    [9, 6, 3, 3, '#ffe066'],
    [5, 7, 1, 1, '#00000050'],
    [10, 7, 1, 1, '#00000050'],
    // door
    [7, 11, 2, 5, roofDark],
    [8, 13, 1, 1, '#ffd54f'],
    // ground line
    [1, 16, 14, 1, '#5a4a3a'],
  ], `building building-${id}`);
}

// Rail sprite — drawn per tile based on which of its 4 neighbors are also
// rail. Connections {n,e,s,w} produce horizontals, verticals, L-corners,
// T-junctions, crosses, and isolated stubs from the same primitive.
function railSprite(conn) {
  const { n = false, e = false, s = false, w = false } = conn;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 44 44');
  svg.setAttribute('shape-rendering', 'crispEdges');
  svg.setAttribute('class', 'rail-svg');
  svg.setAttribute('preserveAspectRatio', 'none');

  const tie = '#7a4a1a';
  const tieDark = '#4a2810';
  const railHi = '#f0f0f4';
  const railMid = '#b8b8c0';
  const railLo = '#5a5a64';

  const rects = [];

  // Ties go perpendicular to the rail. Spaced every 8px, 5px thick.
  if (e || w) {
    const xs = w ? 0 : 16;
    const xe = e ? 44 : 28;
    for (let x = xs; x < xe; x += 8) {
      rects.push([x, 12, 5, 20, tie]);
      rects.push([x + 5, 12, 1, 20, tieDark]);
    }
  }
  if (n || s) {
    const ys = n ? 0 : 16;
    const ye = s ? 44 : 28;
    for (let y = ys; y < ye; y += 8) {
      rects.push([12, y, 20, 5, tie]);
      rects.push([12, y + 5, 20, 1, tieDark]);
    }
  }

  // Silver rails: two parallel 3px stripes per direction, with shading.
  function hrail(xa, xb) {
    rects.push([xa, 16, xb - xa, 1, railHi]);
    rects.push([xa, 17, xb - xa, 1, railMid]);
    rects.push([xa, 18, xb - xa, 1, railLo]);
    rects.push([xa, 26, xb - xa, 1, railHi]);
    rects.push([xa, 27, xb - xa, 1, railMid]);
    rects.push([xa, 28, xb - xa, 1, railLo]);
  }
  function vrail(ya, yb) {
    rects.push([16, ya, 1, yb - ya, railHi]);
    rects.push([17, ya, 1, yb - ya, railMid]);
    rects.push([18, ya, 1, yb - ya, railLo]);
    rects.push([26, ya, 1, yb - ya, railHi]);
    rects.push([27, ya, 1, yb - ya, railMid]);
    rects.push([28, ya, 1, yb - ya, railLo]);
  }
  if (w) hrail(0, 22);
  if (e) hrail(22, 44);
  if (n) vrail(0, 22);
  if (s) vrail(22, 44);

  // Isolated tile: a tiny platform stub so it doesn't look broken.
  if (!n && !e && !s && !w) {
    rects.push([14, 14, 16, 16, '#3a3a44']);
    rects.push([16, 16, 12, 12, railMid]);
    rects.push([18, 18, 8, 8, railHi]);
  }

  for (const [x, y, w_, h_, fill] of rects) {
    const r = document.createElementNS(SVG_NS, 'rect');
    r.setAttribute('x', x);
    r.setAttribute('y', y);
    r.setAttribute('width', w_);
    r.setAttribute('height', h_);
    r.setAttribute('fill', fill);
    svg.appendChild(r);
  }
  return svg;
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
        if (dragMode) return;
        highlightCommuter(id);
        showHoverCard(id, div);
      });
      div.addEventListener('mouseleave', () => {
        if (dragMode) return;
        clearHighlight();
        hideHoverCard();
      });
    } else if (destByKey.has(k)) {
      const lower = destByKey.get(k);
      const upper = lower.toUpperCase();
      const meta = COMMUTER_META[upper];
      div.classList.add('dest', `dest-${lower}`);
      div.dataset.commuter = upper;
      div.appendChild(buildingSprite(upper));

      div.addEventListener('mouseenter', () => {
        if (dragMode) return;
        highlightCommuter(upper);
        showHoverCard(upper, div);
      });
      div.addEventListener('mouseleave', () => {
        if (dragMode) return;
        clearHighlight();
        hideHoverCard();
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
    const isRail = state.rail.has(k);
    el.classList.toggle('rail', isRail);
    const oldRail = el.querySelector(':scope > .rail-svg');
    if (oldRail) oldRail.remove();
    if (isRail) {
      const [x, y] = k.split(',').map(Number);
      el.appendChild(railSprite({
        n: state.rail.has(`${x},${y - 1}`),
        e: state.rail.has(`${x + 1},${y}`),
        s: state.rail.has(`${x},${y + 1}`),
        w: state.rail.has(`${x - 1},${y}`),
      }));
    }
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
  // No auto-modal — the modal is gated behind the Submit button now,
  // so player chooses when to "lock in" their solution.
}

function renderHud(r) {
  hud.innerHTML = '';
  const deadline = LEVEL_1.deadline;

  // Top row: the puzzle's prompt + Submit on the right.
  const top = document.createElement('div');
  top.className = 'hud-row top';

  const title = document.createElement('h1');
  title.className = 'hud-title';
  title.innerHTML =
    `Add train tracks to help everyone get to work in ` +
    `<span class="deadline">${deadline} minutes</span>!`;
  top.appendChild(title);

  const submit = document.createElement('button');
  submit.className = 'hud-btn primary';
  submit.textContent = 'SUBMIT';
  submit.addEventListener('click', () => showResultModal(currentRoutes));
  top.appendChild(submit);

  hud.appendChild(top);

  // Bottom row: speeds, rail count, Clear, version.
  const bottom = document.createElement('div');
  bottom.className = 'hud-row bottom';

  const walk = document.createElement('span');
  walk.className = 'hud-sub-item';
  walk.innerHTML =
    `<span class="label">Walking:</span> ` +
    `<span class="value">${LEVEL_1.walkCost} min/tile</span>`;
  bottom.appendChild(walk);

  const sep1 = document.createElement('span');
  sep1.className = 'hud-sep';
  sep1.textContent = '·';
  bottom.appendChild(sep1);

  const rail = document.createElement('span');
  rail.className = 'hud-sub-item';
  rail.innerHTML =
    `<span class="label">Rail:</span> ` +
    `<span class="value">${LEVEL_1.railCost} min/tile</span>`;
  bottom.appendChild(rail);

  const sep2 = document.createElement('span');
  sep2.className = 'hud-sep';
  sep2.textContent = '·';
  bottom.appendChild(sep2);

  const railCount = document.createElement('span');
  railCount.className = 'hud-rail-count';
  railCount.innerHTML =
    `Rail tiles used: <span class="num">${r.railCount}</span> / ${LEVEL_1.hardCap}`;
  bottom.appendChild(railCount);

  const clearBtn = document.createElement('button');
  clearBtn.className = 'hud-btn';
  clearBtn.textContent = 'CLEAR';
  clearBtn.disabled = r.railCount === 0;
  clearBtn.addEventListener('click', clearAllRail);
  bottom.appendChild(clearBtn);

  const ver = document.createElement('span');
  ver.className = 'hud-version';
  ver.title = `Build ${BUILD}. If this number lags behind GitHub, Pages hasn't redeployed yet — hard-refresh.`;
  ver.textContent = `v${VERSION}`;
  bottom.appendChild(ver);

  hud.appendChild(bottom);
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

function showHoverCard(id, anchorEl) {
  if (!currentRoutes) return;
  const c = currentRoutes.commuters.find((x) => x.id === id);
  if (!c) return;
  const meta = COMMUTER_META[id];
  const status = statusFor(c.time);
  const deadline = LEVEL_1.deadline;
  const delta = c.time - deadline;
  const deltaStr = !Number.isFinite(c.time)
    ? 'no route — stuck'
    : delta > 0
      ? `${delta.toFixed(1)} min late`
      : delta === 0
        ? 'right on the bell'
        : `${Math.abs(delta).toFixed(1)} min to spare`;

  hoverCard.innerHTML = '';
  hoverCard.dataset.status = status;
  hoverCard.style.setProperty('--accent', `var(--commuter-${id})`);

  const header = document.createElement('div');
  header.className = 'hc-header';
  const sp = document.createElement('span');
  sp.className = 'hc-sprite';
  sp.appendChild(personSprite(id));
  const info = document.createElement('div');
  const name = document.createElement('div');
  name.className = 'hc-name';
  name.textContent = `Commuter ${id}`;
  const dest = document.createElement('div');
  dest.className = 'hc-dest';
  dest.textContent = `→ ${meta.destLabel}`;
  info.appendChild(name);
  info.appendChild(dest);
  header.appendChild(sp);
  header.appendChild(info);
  hoverCard.appendChild(header);

  const time = document.createElement('div');
  time.className = 'hc-time';
  time.textContent = formatTime(c.time);
  hoverCard.appendChild(time);

  const delt = document.createElement('div');
  delt.className = 'hc-delta';
  delt.textContent = deltaStr;
  hoverCard.appendChild(delt);

  const dl = document.createElement('div');
  dl.className = 'hc-deadline';
  dl.textContent = `Deadline: ${deadline.toFixed(0)} min`;
  hoverCard.appendChild(dl);

  positionHoverCard(anchorEl);
  hoverCard.style.display = 'block';
}

function positionHoverCard(anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  // Measure card after content is set.
  const cardRect = hoverCard.getBoundingClientRect();
  const cardW = cardRect.width || 220;
  const cardH = cardRect.height || 140;
  const margin = 12;

  // Prefer to the right of the tile; fall back to left if overflow.
  let left = rect.right + margin;
  if (left + cardW > window.innerWidth - 8) {
    left = rect.left - cardW - margin;
  }
  if (left < 8) left = 8;

  // Vertically align with the tile, clamp to viewport.
  let top = rect.top + (rect.height / 2) - (cardH / 2);
  if (top + cardH > window.innerHeight - 8) {
    top = window.innerHeight - cardH - 8;
  }
  if (top < 8) top = 8;

  hoverCard.style.left = `${Math.round(left)}px`;
  hoverCard.style.top = `${Math.round(top)}px`;
}

function hideHoverCard() {
  hoverCard.style.display = 'none';
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
}

function clearHighlight() {
  clearTileHighlights();
}

function clearTileHighlights() {
  for (const el of tileByKey.values()) el.classList.remove('highlight');
}

// ---------- Result modal (success or "not yet") ----------

function showResultModal(r) {
  const existing = document.getElementById('result-modal');
  if (existing) existing.remove();
  hideHoverCard();

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.id = 'result-modal';
  backdrop.dataset.medal = r.medal;

  const modal = document.createElement('div');
  modal.className = 'result-modal';
  modal.dataset.medal = r.medal;

  if (r.allPass) modal.appendChild(buildMedalBlock(r));

  const title = document.createElement('h2');
  title.className = 'modal-title';
  title.textContent = r.allPass ? 'EVERYONE ON TIME!' : 'NOT YET!';
  modal.appendChild(title);

  if (r.allPass) {
    modal.appendChild(buildScoreBlock(r));
  } else {
    modal.appendChild(buildLateList(r));
  }

  const message = document.createElement('div');
  message.className = 'modal-message';
  message.textContent = messageForResult(r);
  modal.appendChild(message);

  const btn = document.createElement('button');
  btn.className = 'modal-btn';
  btn.textContent = r.allPass ? 'KEEP BUILDING' : 'TRY AGAIN';
  btn.addEventListener('click', () => closeModal());
  modal.appendChild(btn);

  function closeModal() {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
  }
  function onKey(e) { if (e.key === 'Escape') closeModal(); }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener('keydown', onKey);

  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function buildMedalBlock(r) {
  const wrap = document.createElement('div');
  wrap.className = 'medal-wrap';

  const icon = document.createElement('div');
  icon.className = 'medal-icon';
  icon.dataset.medal = r.medal;
  icon.textContent = '★';
  wrap.appendChild(icon);

  const stars = document.createElement('div');
  stars.className = 'medal-stars';
  const starCount = r.medal === 'gold' ? 3 : r.medal === 'silver' ? 2 : 1;
  stars.textContent = '★'.repeat(starCount) + '☆'.repeat(3 - starCount);
  wrap.appendChild(stars);

  const label = document.createElement('div');
  label.className = 'medal-label';
  label.dataset.medal = r.medal;
  label.textContent = r.medal.toUpperCase();
  wrap.appendChild(label);

  return wrap;
}

function buildScoreBlock(r) {
  const block = document.createElement('div');
  block.className = 'modal-scores';

  const your = document.createElement('div');
  your.className = 'score-row your-row';
  your.innerHTML =
    `<span class="score-label">YOUR SOLUTION</span>` +
    `<span class="score-num">${r.railCount}</span>` +
    `<span class="score-unit">rail tiles</span>`;
  block.appendChild(your);

  const best = document.createElement('div');
  best.className = 'score-row best-row';
  best.innerHTML =
    `<span class="score-label">BEST KNOWN</span>` +
    `<span class="score-num">${LEVEL_1.gold}</span>` +
    `<span class="score-unit">rail tiles</span>`;
  block.appendChild(best);

  return block;
}

function buildLateList(r) {
  const onTime = r.commuters.filter((c) => c.time <= LEVEL_1.deadline).length;
  const total = r.commuters.length;

  const wrap = document.createElement('div');
  wrap.className = 'modal-scores';

  const header = document.createElement('div');
  header.className = 'score-row';
  header.innerHTML =
    `<span class="score-label">ON TIME</span>` +
    `<span class="score-num">${onTime}</span>` +
    `<span class="score-unit">of ${total}</span>`;
  wrap.appendChild(header);

  const late = r.commuters.filter((c) => c.time > LEVEL_1.deadline);
  if (late.length) {
    const list = document.createElement('div');
    list.className = 'late-list';
    for (const c of late) {
      const row = document.createElement('div');
      row.className = 'late-row';
      row.dataset.id = c.id;
      row.innerHTML =
        `<span>Commuter ${c.id}</span>` +
        `<span class="lr-time">${formatTime(c.time)}</span>`;
      list.appendChild(row);
    }
    wrap.appendChild(list);
  }

  return wrap;
}

function messageForResult(r) {
  if (!r.allPass) {
    const onTime = r.commuters.filter((c) => c.time <= LEVEL_1.deadline).length;
    const missing = r.commuters.length - onTime;
    if (missing === 1) {
      return 'One commuter is still over the deadline. Lay more rail along their path and submit again.';
    }
    return `${missing} commuters are still over the deadline. Try a shared corridor that helps more than one route.`;
  }
  const gold = LEVEL_1.gold;
  const delta = r.railCount - gold;
  if (r.medal === 'gold') return 'Maximum optimization. You found the shared corridor.';
  if (r.medal === 'silver') return `Solid. ${delta} tile${delta === 1 ? '' : 's'} above the gold solution — can you trim further?`;
  return `Solved. ${delta} tiles above gold. There's a much shorter solution hiding in there.`;
}

render();
