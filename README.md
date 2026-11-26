# Tianle Yang · The Study

Click the bookshelf in Tianle Yang’s illustrated study to read mathematical notes, or open the door to play a short pixel RPG.

## Run locally

Open PowerShell in this directory. Install the dependencies on the first run, then start Vite.

```powershell
npm.cmd install
npm.cmd run dev
```

Open the local address Vite prints. In the study, click an object or select it with **Tab** and **Enter**. Outdoors, move with WASD or the arrow keys and press **E** to interact. Touch screens have direction buttons and **Interact**. Return through the waystation door to read in the study and resume the same adventure. Refreshing or closing the page ends the run.

Use **Music** in the footer to play the optional background track. It is off by default. The current track is *Medieval Abbey* by matthewmikemusic (Pixabay Content License). The footer keeps the track, artist, and license credit.

Run `npm.cmd run build` to type-check the project and generate the static site in `dist/`.

## Project layout

| Path | Contents |
| --- | --- |
| `index.html`, `src/` | Page, study hotspots, reading panel, and game |
| `content/` | Editable HTML and game text |
| `public/` | Runtime art and audio |
| `docs/` | Architecture and editing guide |
| `artwork/` | Concept and production files, not shipped |

## Credits

The code is MIT licensed. Music, homepage artwork, game sprites, and fonts are credited in [CREDITS.md](CREDITS.md).

## Where to start

- Add a [mathematical note](content/home/notes.html), edit the [wayfarer’s dialogue](content/game/world.json), or move the NPC using `WAYFARER` in the [map coordinates](src/game/maps.ts). The [editing guide](docs/EDITING_GUIDE.md) walks through each change, plus maps, hotspots, and art.
- To follow a bookshelf click from the homepage into the reading panel, or a trip through the door and back, read the [architecture walkthrough](docs/ARCHITECTURE.md).
