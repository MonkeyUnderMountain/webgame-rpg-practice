// scripts/export-study.mjs
// 调用本机 Aseprite CLI，从指定房间的主工程导出底图、零件和场景清单。
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const ROOMS = {
  mage: {
    master: 'artwork/study/study-master.aseprite',
    outDir: 'public/art/study/mage',
    initScript: 'scripts/init-study-master.lua',
  },
  side: {
    master: 'artwork/study/side-view/study-side-master.aseprite',
    outDir: 'public/art/study/side',
    initScript: 'scripts/init-side-master.lua',
  },
};

function parseRoomArg(argv) {
  const inline = argv.find((arg) => arg.startsWith('--room='));
  if (inline) return inline.slice('--room='.length);
  const idx = argv.indexOf('--room');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1];
  return process.env.STUDY_ROOM || 'mage';
}

const roomId = parseRoomArg(process.argv.slice(2));
const room = ROOMS[roomId];
if (!room) {
  console.error(`Unknown room "${roomId}". Expected one of: ${Object.keys(ROOMS).join(', ')}`);
  process.exit(1);
}

const root = process.cwd();
const masterFile = resolve(root, room.master);
const outDir = resolve(root, room.outDir);
const propsDir = resolve(outDir, 'props');

mkdirSync(propsDir, { recursive: true });
mkdirSync(resolve(masterFile, '..'), { recursive: true });

const candidatePaths = [
  process.env.ASEPRITE_PATH,
  'C:\\Program Files\\Aseprite\\Aseprite.exe',
  'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Aseprite\\Aseprite.exe',
  'D:\\SteamLibrary\\steamapps\\common\\Aseprite\\Aseprite.exe',
  '/Applications/Aseprite.app/Contents/MacOS/aseprite',
  'aseprite',
].filter(Boolean);

const asepriteBin = candidatePaths.find((candidate) => (
  candidate === 'aseprite' || existsSync(candidate)
));

if (!asepriteBin) {
  console.error('Could not find Aseprite executable. Set ASEPRITE_PATH or install Aseprite.');
  process.exit(1);
}

function runLua(scriptRelPath) {
  const scriptPath = resolve(root, scriptRelPath);
  const result = spawnSync(asepriteBin, ['-b', '--script-param', `room=${roomId}`, '--script', scriptPath], {
    cwd: root,
    env: { ...process.env, STUDY_ROOM: roomId },
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const forceInit = process.argv.includes('--init');
if (process.argv.includes('--repave')) {
  if (roomId !== 'side' || !forceInit) {
    console.error('--repave requires --room=side and --init.');
    process.exit(1);
  }
  console.log('[side] Repaving the starter background from the flagstone tiles...');
  runLua('scripts/pave-side-floor.lua');
}
if (forceInit || !existsSync(masterFile)) {
  console.log(`[${roomId}] Initializing ${room.master}...`);
  runLua(room.initScript);
}

console.log(`[${roomId}] Exporting layers and generating scene manifest...`);
runLua('scripts/export-study.lua');
