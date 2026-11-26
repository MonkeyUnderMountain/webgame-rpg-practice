// scripts/export-study.mjs
// 调用本机 Aseprite CLI，从 artwork/study/study-master.aseprite (960×540)
// 自动裁剪并导出 2× (1920×1080) 零件与精灵表，更新 src/study-scene.json。
import { existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = process.cwd();
const masterFile = resolve(root, 'artwork/study/study-master.aseprite');
const propsDir = resolve(root, 'public/art/study/mage/props');

mkdirSync(propsDir, { recursive: true });
mkdirSync(resolve(root, 'artwork/study'), { recursive: true });

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
if (forceInit || !existsSync(masterFile)) {
  console.log('Initializing artwork/study/study-master.aseprite (960×540)...');
  runLua('scripts/init-study-master.lua');
}

console.log('Exporting 2× layers and generating src/study-scene.json...');
runLua('scripts/export-study.lua');
