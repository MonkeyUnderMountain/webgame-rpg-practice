// scripts/export-study.mjs
// 调用本机 Aseprite CLI，从书房主工程导出底图、零件和场景清单。
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const room = {
  master: 'artwork/study/room/study-master.aseprite',
  outDir: 'public/art/study',
  initScript: 'scripts/init-study-master.lua',
};

const root = process.cwd();
const masterFile = resolve(root, room.master);
const outDir = resolve(root, room.outDir);
const propsDir = resolve(outDir, 'props');
const uiDir = resolve(outDir, 'ui');

mkdirSync(propsDir, { recursive: true });
mkdirSync(uiDir, { recursive: true });
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
  const result = spawnSync(asepriteBin, ['-b', '--script', scriptPath], {
    cwd: root,
    env: process.env,
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
  if (!forceInit) {
    console.error('--repave requires --init.');
    process.exit(1);
  }
  console.log('[study] Repaving the starter background from the flagstone tiles...');
  runLua('scripts/pave-floor.lua');
}
if (forceInit || !existsSync(masterFile)) {
  console.log(`[study] Initializing ${room.master}...`);
  runLua(room.initScript);
}

console.log('[study] Exporting layers and generating scene manifest...');
runLua('scripts/export-study.lua');
