# Tianle Yang · The Study

An illustrated pixel-art academic homepage for Tianle Yang, built on a single **640×360** layered Aseprite room and exported at **3× / 1920×1080**.

The room is the site's only scene. Six hotspots connect the furniture to the homepage:

| Section | Object |
| --- | --- |
| **News** | cork noticeboard |
| **Research** | chalkboard |
| **About** | desk + chair workspace |
| **Notes** | bookcase |
| **Side quests** | supply box beside the desk |
| **Look outside** | wooden door |

The three pinned notes on the noticeboard are still individually readable; clicking the cork board itself opens **News**.

## Run locally

Open PowerShell in this directory. Install dependencies on the first run, then start Vite:

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local address Vite prints. In the study:

- Hover or click any of the six objects, or navigate with **Tab** and **Enter** / **Space**.
- Click a pinned note to read its short text; click the surrounding board for **News**.
- Press **Esc** or click outside a scroll to close it.
- Append `?debug=hotspots` to the URL to inspect the 640×360 pixel hit mask and Marching Squares golden contours.

## Edit the room

The editable master is [`artwork/study/room/study-master.aseprite`](artwork/study/room/study-master.aseprite). It is rebuilt from [`room-base.png`](artwork/study/room/room-base.png), the native-size [props](artwork/study/room/props/), and the [furnished reference](artwork/study/references/reference.jpg) by [`scripts/init-study-master.lua`](scripts/init-study-master.lua).

Layer groups:

- `00_room_base` — wall, window opening, floor and wall foot.
- `05_floor_light` — cool floor shade, lantern glow and window light, beneath the furniture.
- `10_beyond` / `20_furniture` — window view, frame, door, chalkboard, desk, computer, book, chair and bookcase.
- `30_chalkboard` — the chalk diagram.
- `35_notice_papers` — three pinned notes; layer name is the title, **User Data** is the text.
- `40_lights_and_screens` — four-frame lantern flame and monitor pulse.
- `99_hotspot_mask` — hidden 640×360 six-colour mask; its colours must match `SECTION_SPECS` in [`scripts/export-study.lua`](scripts/export-study.lua).

After editing layers in Aseprite, run:

```powershell
npm.cmd run art:export
```

This invokes Aseprite CLI ([`scripts/export-study.mjs`](scripts/export-study.mjs)) to export the 3× room base, trim and export all static/animated props to `public/art/study/props/`, keep `hotspots.png` at 640×360, and regenerate [`src/study-scene.json`](src/study-scene.json).

To rebuild the master from source, run:

```powershell
npm.cmd run art:init
```

`npm.cmd run art:repave` re-lays the floor from the wide-slab sheet before rebuilding. Use `art:export` for edits made directly in the master; `art:init` overwrites the master from the source assets.

To rearrange the bookcase, expand `20_furniture/prop_bookcase`. Each of its four shelves has a board and movable book groups built from the same [upright, leaning and stacked books](artwork/study/room/props/bookcase/). The whole cabinet exports as one `props/bookcase.png`; the brass tetrahedron lives in `shelf_3`.

The lantern housing is stationary and only the four flame frames move. Its wall glow and floor pool are separate static layers. The monitor dot is a four-frame strip; per-state `durationMs` in [`scripts/export-study.lua`](scripts/export-study.lua) sets the lantern to 240 ms per frame and the monitor to 900 ms per frame.

The floor uses [six wide slabs](artwork/study/room/tiles/large-flagstones.png), each 112×24 pixels, laid in four staggered courses. Paint on the indexed sheet with the warm-grey ramp (palette indices 8–15). The [AI mood reference](artwork/study/references/ai-mood.jpg) is a lighting/colour study generated from the room and the furnished reference; it is not loaded by the game.

## Edit the section content

The five written sections are plain HTML in [`content/home/`](content/home/):

| Section | File |
| --- | --- |
| About | [`profile.html`](content/home/profile.html) |
| Notes | [`notes.html`](content/home/notes.html) |
| News | [`news.html`](content/home/news.html) |
| Research | [`research.html`](content/home/research.html) |
| Side quests | [`quests.html`](content/home/quests.html) |

Edit the HTML, then refresh the page and check the matching object, the top navigation, and the `#profile` / `#notes` / `#news` / `#research` / `#quests` URL anchors.

The door scroll uses [`public/art/study/outside.svg`](public/art/study/outside.svg). Replace that file or update the `<img>` in the `#door-dialog` block of [`index.html`](index.html).

## Build for production

```powershell
npm.cmd run build
```

This type-checks the TypeScript source and builds the static site into `dist/`.

## Project layout

| Path | Contents |
| --- | --- |
| [`artwork/study/room/`](artwork/study/room/) | Aseprite master, 640×360 base, native props and floor tiles |
| [`artwork/study/references/`](artwork/study/references/) | Furnished stone-room reference and AI lighting study |
| [`artwork/study/archive/`](artwork/study/archive/) | Retained early concepts, pixel tests and the [hand-traced 320×180 project](artwork/study/archive/perspective-tracing/study-v3-trace-320.aseprite) |
| `public/art/study/` | Runtime `study.png`, `hotspots.png`, `props/*.png` and `outside.svg` |
| `scripts/` | Aseprite initialization, floor paving and export scripts |
| `src/` | Scene runtime, hit-mask tracing, parchment panels and music control |
| `content/home/` | Editable HTML for the five written sections |
| `docs/` | [Architecture walkthrough](docs/ARCHITECTURE.md) and [editing guide](docs/EDITING_GUIDE.md) |

## Credits

The code is MIT licensed. Music, homepage artwork, and fonts are credited in [CREDITS.md](CREDITS.md).
