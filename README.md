# A Better Subway

An interactive graph-optimization puzzle disguised as a city map. You're given
four commuters who each walk a slow route to work; you have a budget of fast
"train tracks" to lay on the grid. Goal: get everyone to work in 20 minutes or
less, using as few tracks as possible.

Live: **https://mllee.github.io/abettersubway/**

## What you do

- **Click an empty tile** to lay a track. Click an existing track to remove it.
- **Click and drag** to paint a strip of track at once.
- **Hover a commuter or a workplace** to see their current route and time.
- **Submit** when you think you're done — you'll see your medal tier (gold,
  silver, bronze) and the best known solution for comparison.
- **◀ ▶ in the result modal** flip between cities.

## Levels

Two so far, both 16×16:

- **San Francisco** — Bay on the north and east, Golden Gate Park splitting
  the city, Twin Peaks in the middle, McLaren cluster down south. Commuters
  arranged in a rotational pattern (each one heads in a different cardinal
  direction).
- **New York City** — Hudson and East River on each side, Central Park
  dominating the middle, smaller scattered parks throughout Manhattan, with
  "speed-bump" obstacles that break naive long horizontal rails.

Both levels are designed so that two different players solving them reach the
gold tier via geometrically different track layouts — that's the design bar
we calibrate against (see `tools/solve.mjs`).

## Tech

Plain static site, zero build step:

- ES modules served straight from disk (`<script type="module">`).
- No bundler, no transpiler, no framework.
- GitHub Pages from `main`.

To run locally, any static file server works:

```
python3 -m http.server 8731
# then open http://localhost:8731/
```

## File map

```
index.html       Three semantic regions (#hud, #app, #commuters), loads ui.js.
ui.js            Renders the board, HUD, hover cards, success modal, and
                 wires up rail placement / drag-paint / level switching.
styles.css       All the styling — retro pixel theme (Press Start 2P, VT323).
mechanics.js     The game logic — createState, placeRail, removeRail,
                 computeRoutes. Pure data in / data out, no DOM.
level1.js        San Francisco level data (obstacles + commuters + tiers).
level2.js        New York City level data.
levels.js        Level registry + active-level persistence in localStorage.
version.js       Build version stamp. Bumped on every deploy.
tools/solve.mjs  Multi-start hillclimb solver. Given a level file, finds the
                 minimum-rail layout that gets every commuter under the
                 deadline. Used to verify gold targets and compute the
                 "Reveal best solution" hint.
```

## Adding a level

1. Create `levelN.js` exporting a `LEVEL_N` const with the same shape as
   `LEVEL_1` (see `level1.js` for the schema — width, height, parks/water/
   hills/greenParks, commuters, tier targets, deadline, `oceanEdges`).
2. Register it in `levels.js` (append to the `LEVELS` array).
3. Run `node tools/solve.mjs levelN.js --trials=30` to verify the gold
   target you set is achievable and to grab a canonical `goldSolution`.

The grid renderer in `ui.js` picks up `width`, `height`, the three obstacle
subsets, and `oceanEdges` automatically — no level-specific UI code needed.
