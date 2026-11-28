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

## Side-view study (640×360)

Open `/?room=side` for the **640×360**, 23-color pixel room. Edit its background, props and hotspots on the same grid in the [Aseprite master](artwork/study/side-view/study-side-master.aseprite). In **Room style**, choose **Original tiled room · 960×540** (`/?room=side&style=tiled-960`) to compare the previous background, or select the [furnished reference](artwork/study/side-view/reference.jpg).

After editing layers in the side-view Aseprite master, run:

```powershell
npm.cmd run art:side:export
```

This exports the background and nonempty props at `3×`, keeps `hotspots.png` at `640×360`, and regenerates [`src/study-side-scene.json`](src/study-side-scene.json). `npm.cmd run art:side:init` recreates the master from the [pixel background](artwork/study/side-view/variants/study-side-view-pixel-640.png) and [native-size props](artwork/study/side-view/props/), with the furnished reference on a hidden layer. Edit `prop_window_view` to change the landscape. The walnut desk, computer and open book are separate layers; hide `prop_computer` and `prop_book` to see the bare tabletop.

To rearrange the bookcase, expand `20_furniture/prop_bookcase` in the master. Each of its four shelves has a board and movable book groups built from the same [upright, leaning and stacked books](artwork/study/side-view/props/bookcase/). The whole cabinet exports as one `props/bookcase.png`.

The graphite chair (`20_furniture/prop_desk_chair`) carries its own contact shadow. The sunlight cast through the two arched panes is a separate transparent floor layer (`05_floor_light/prop_window_light`), beneath the furniture. A cool ambient wash (`prop_floor_shade`) and the door-side lantern glow (`prop_wall_lamp_glow`) sit under it. The lantern itself uses four flame frames; the monitor has a four-frame `prop_monitor_pulse` dot. Per-state `durationMs` in [`scripts/export-study.lua`](scripts/export-study.lua) sets their animation speed.

The floor uses [four editable flagstones](artwork/study/side-view/tiles/warm-flagstones.png), each 56×16 pixels. Paint on the indexed sheet with the warm-grey ramp (palette indices 8–15). `npm.cmd run art:side:init -- --repave` tiles the starter background in six staggered rows, then rebuilds the master from source and exports it. For edits made directly in the master, use `art:side:export` instead. The [AI mood reference](artwork/study/side-view/variants/study-side-view-ai-reference.jpg) is a lighting/colour study generated from the current room and the furnished reference; it is not loaded by the game.

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
| `public/` | Exported runtime artwork (`study.png`, `props/*.png`), `hotspots.png`, `beyond.svg`, and audio |
| `docs/` | [Architecture walkthrough](docs/ARCHITECTURE.md) and [editing guide](docs/EDITING_GUIDE.md) |

## Credits

The code is MIT licensed. Music, homepage artwork, and fonts are credited in [CREDITS.md](CREDITS.md).
