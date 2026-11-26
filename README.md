# Tianle Yang · The Study

An illustrated academic homepage for Tianle Yang. Click objects in the study—the noticeboard, chalkboard, desk, bookshelf, bench, or door—to unroll parchment scrolls with notes, research, and a glimpse outside.

## Run locally

Open PowerShell in this directory. Install the dependencies on the first run, then start Vite.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local address Vite prints. In the study, click any object or navigate with **Tab** and **Enter**, or use the top navigation links. Press **Esc** or click outside a scroll to close it.

Use **Music** in the footer to play the optional background track. It is off by default. The current track is *Medieval Abbey* by matthewmikemusic (Pixabay Content License). The footer keeps the track, artist, and license credit.

Run `npm.cmd run build` to type-check the project and generate the static site in `dist/` (configured for root-domain deployment).

## Project layout

| Path | Contents |
| --- | --- |
| `index.html`, `src/` | Page, study hotspots, parchment scroll panels, and music control |
| `content/home/` | Editable HTML for the five homepage sections |
| `public/` | Runtime study artwork, favicon, door placeholder, and audio |
| `docs/` | Architecture and editing guide |
| `artwork/` | Concept and production files, not shipped |

## Credits

The code is MIT licensed. Music, homepage artwork, and fonts are credited in [CREDITS.md](CREDITS.md).

## Where to start

- Add a [mathematical note](content/home/notes.html), update [research](content/home/research.html), or swap the scenic view behind the door. The [editing guide](docs/EDITING_GUIDE.md) walks through each change, plus hotspots and audio.
- To refine the clickable areas and golden outlines, open the hotspot mask workbench at `/artwork/homepage-concepts/preview/label-tool.html` with `npm.cmd run dev`, paint or erase with the mask labels, then save `hotspots.png` over `public/art/study/mage/hotspots.png`.
- To follow a bookshelf click from the homepage into the reading scroll, read the [architecture walkthrough](docs/ARCHITECTURE.md).
