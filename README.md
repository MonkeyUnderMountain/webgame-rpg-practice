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

## Edit pixel art & modular props

All room layers, replaceable props, 4-frame animations, and the base hotspot mask live in a single **`960×540`** Aseprite master project: [`artwork/study/study-master.aseprite`](artwork/study/study-master.aseprite).

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
| `artwork/study/` | `study-master.aseprite` (960×540 master project) and pristine source backups |
| `scripts/` | Aseprite CLI batch scripts (`export-study.mjs`, `export-study.lua`, `init-study-master.lua`) |
| `index.html`, `src/` | Layered scene runtime, Alpha-channel contour tracing, parchment scroll panels, and music control |
| `content/home/` | Editable HTML for the five homepage sections (`profile`, `notes`, `news`, `research`, `quests`) |
| `public/` | Exported 2× runtime artwork (`study.png`, `props/*.png`), `hotspots.png`, `beyond.svg`, and audio |
| `docs/` | [Architecture walkthrough](docs/ARCHITECTURE.md) and [editing guide](docs/EDITING_GUIDE.md) |

## Credits

The code is MIT licensed. Music, homepage artwork, and fonts are credited in [CREDITS.md](CREDITS.md).
