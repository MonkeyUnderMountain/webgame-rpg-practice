# Tianle Yang · The Study

An illustrated pixel-art academic homepage for Tianle Yang, built on a **960×540** layered Aseprite scene (exported at **2× / 1920×1080**).

Click the main objects in the study—the noticeboard, chalkboard, desk, bookshelf, bench, or door—to unroll parchment scrolls with notes, research, and a glimpse outside. You can also interact with objects right inside the room: click the three candles to light or extinguish them, or click the chalk tray along the bottom of the chalkboard to redraw the mathematical diagrams on the wall.

## Run locally

Open PowerShell in this directory. Install dependencies on the first run, then start Vite:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local address Vite prints. In the study:
- Hover or click any object, or navigate with **Tab** and **Enter** / **Space**.
- Press **Esc** or click outside a scroll to close it.
- Append `?debug=hotspots` to the URL to inspect the 960×540 pixel hit mask and Marching Squares golden contours.

## Side-view layout reference

Open `/?room=side` on the local site to see the approved [1280×720 reference illustration](artwork/study/side-view/reference.jpg). Use this image for the position, scale and lighting of each new prop: the arched door is on the left, the wide chalkboard has clear floor space in front, and the window, modern desk and bookcase are grouped on the right. The **Room style** picker shows the other seven studies for comparison.

## Edit pixel art & modular props

The interactive homepage at `/` uses a separate **960×540** Aseprite master: [`artwork/study/study-master.aseprite`](artwork/study/study-master.aseprite). It contains the room layers, replaceable props, 4-frame animations and base hotspot mask.

After editing layers in Aseprite, run:

```powershell
npm.cmd run art:export
```

This invokes Aseprite CLI ([`scripts/export-study.mjs`](scripts/export-study.mjs)) to export the `2×` (`1920×1080`) room base, trim and export all static/animated prop sprites to `public/art/study/mage/props/`, and regenerate [`src/study-scene.json`](src/study-scene.json).

## Build for production

```powershell
npm.cmd run build
```

This type-checks the TypeScript source and builds the root-domain static site into `dist/`.

## Project layout

| Path | Contents |
| --- | --- |
| `artwork/study/` | Interactive Aseprite master and its source room and hotspot images |
| [`artwork/study/side-view/`](artwork/study/side-view/) | `reference.jpg` is the chosen layout; `variants/` holds the seven alternative previews |
| [`artwork/study/archive/`](artwork/study/archive/) | Early concepts, pixel tests, shell staging, side-view studies and wall-lamp trials, grouped by topic. The [hand-traced 320×180 project](artwork/study/archive/perspective-tracing/study-v3-trace-320.aseprite) is kept with its guides and previews. |
| `scripts/` | Aseprite export and initialization scripts, and the local ComfyUI pixel-art experiment |
| `index.html`, `src/` | Layered scene runtime, Alpha-channel contour tracing, parchment scroll panels, and music control |
| `content/home/` | Editable HTML for the five homepage sections (`profile`, `notes`, `news`, `research`, `quests`) |
| `public/` | Exported 2× runtime artwork (`study.png`, `props/*.png`), `hotspots.png`, `beyond.svg`, and audio |
| `docs/` | [Architecture walkthrough](docs/ARCHITECTURE.md) and [editing guide](docs/EDITING_GUIDE.md) |

## Credits

The code is MIT licensed. Music, homepage artwork, and fonts are credited in [CREDITS.md](CREDITS.md).
