// 页面入口。书房立即显示，Phaser 在第一次出门时加载。
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource-variable/space-grotesk';
import './style.css';
import gameInterface from '../content/game/interface.json';
import { mountReadingPanel } from './readingPanel';
import { mountStudy } from './study';
import type { Direction, Encounter, GameCallbacks, GameControls } from './game';



function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}

// 首次出门时创建实例；返回书房只暂停它，下一次出门可以接着玩。
let controls: GameControls | undefined;
let pendingEncounter: Encounter | undefined;
let inWorld = false;
let loadingGameModule = false;
const studyView = element('study-view');
const worldView = element('world-view');
const gameHost = element('game');
const sectionDialog = element<HTMLDialogElement>('section-dialog');
const encounterDialog = element<HTMLDialogElement>('encounter-dialog');
const confirmEncounter = element<HTMLButtonElement>('confirm-encounter');
const areaName = element('area-name');
const objective = element('objective');
const prompt = element('prompt');
const lampStatus = element('lamp-status');
const health = element('health');
const loading = element('loading');
const worldError = element('world-error');
const returnButton = element<HTMLButtonElement>('return-study');

function syncPause() {
  // 书房和弹窗都锁住游戏，并清空按键，防止恢复后继续移动。
  const paused = !inWorld || sectionDialog.open || encounterDialog.open;
  controls?.pause(paused);
  if (paused) document.querySelectorAll('.direction-pad .held').forEach((button) => button.classList.remove('held'));
}



// 书房与异世界切换
function returnToStudy() {
  inWorld = false;
  worldView.hidden = true;
  studyView.hidden = false;
  document.body.classList.remove('world-open');
  syncPause();
  window.scrollTo({ top: 0 });
  element('door').focus({ preventScroll: true });
}

async function enterWorld() {
  studyView.hidden = true;
  worldView.hidden = false;
  returnButton.hidden = Boolean(controls);
  inWorld = true;
  document.body.classList.add('world-open');
  window.scrollTo({ top: 0 });
  if (controls) {
    // 先显示宿主再恢复，Phaser 才能取得正确画布尺寸。
    controls.enterWorld();
    syncPause();
    gameHost.focus({ preventScroll: true });
    return;
  }
  // 等待模块时可以退回书房再出门。多次点击共用这一次加载。
  if (loadingGameModule) return;
  loadingGameModule = true;
  loading.hidden = false;
  worldError.hidden = true;
  gameHost.setAttribute('aria-busy', 'true');
  try {
    const { startGame } = await import('./game');
    if (!inWorld) return;
    controls = startGame(gameHost, callbacks);
    syncPause();
    gameHost.focus({ preventScroll: true });
  } catch (error) {
    console.error(error);
    loading.hidden = true;
    worldError.hidden = false;
    returnButton.hidden = false;
    gameHost.removeAttribute('aria-busy');
  } finally {
    loadingGameModule = false;
  }
}



// 遭遇确认
function finishEncounter(fight: boolean) {
  const current = pendingEncounter;
  pendingEncounter = undefined;
  encounterDialog.close();
  syncPause();
  if (current) {
    // 页面只提交选择；生命值与任务进度由游戏回调结算。
    if (fight) current.confirm();
    else current.cancel();
  }
}

confirmEncounter.addEventListener('click', () => finishEncounter(true));
element('cancel-encounter').addEventListener('click', () => finishEncounter(false));
encounterDialog.addEventListener('cancel', (event) => {
  event.preventDefault();
  finishEncounter(false);
});



// 游戏到页面的回调
const callbacks: GameCallbacks = {
  onReturnHome: returnToStudy,
  onState(state) {
    loading.hidden = true;
    returnButton.hidden = true;
    gameHost.removeAttribute('aria-busy');
    areaName.textContent = state.area;
    objective.textContent = state.objective;
    prompt.textContent = state.prompt;
    prompt.hidden = !state.prompt;
    health.textContent = `${state.health} / ${state.maxHealth}`;
    lampStatus.hidden = !state.hasLamp;
    objective.classList.toggle('objective-complete', state.complete);
  },
  onEncounter(next) {
    pendingEncounter = next;
    const canWin = next.damage < next.health;
    element('encounter-title').textContent = next.name;
    const preview = canWin ? gameInterface.encounter.canWin : gameInterface.encounter.tooDangerous;
    element('encounter-description').textContent = preview
      .replaceAll('{damage}', String(next.damage))
      .replaceAll('{health}', String(next.health));
    confirmEncounter.disabled = !canWin;
    encounterDialog.showModal();
    syncPause();
  },
};



// 触屏控制只用于异世界
document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach((button) => {
  const direction = button.dataset.dir as Direction;
  let activePointer: number | undefined;
  button.addEventListener('pointerdown', (event) => {
    if (activePointer !== undefined) return;
    activePointer = event.pointerId;
    // 捕获该手指，移出按钮后松手也能结束移动。
    button.setPointerCapture(event.pointerId);
    controls?.setDirection(direction, true);
    button.classList.add('held');
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId !== activePointer) return;
    activePointer = undefined;
    controls?.setDirection(direction, false);
    button.classList.remove('held');
  };
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
});

element('touch-interact').addEventListener('click', () => controls?.interact());



// 先创建插图上的链接和房门，再绑定它们；最后同步访客打开的栏目锚点。
mountStudy(element('study-scene'), element('study-art'));
for (const [id, text] of Object.entries(gameInterface.labels)) {
  element(id).textContent = text;
}
document.querySelectorAll<HTMLButtonElement>('[data-enter-world]').forEach((button) => {
  button.addEventListener('click', () => { void enterWorld(); });
});
returnButton.addEventListener('click', returnToStudy);
mountReadingPanel(sectionDialog, () => !encounterDialog.open, syncPause);
