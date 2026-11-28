// 页面入口：挂载 640×360 书房插画、背景音乐、阅读卷轴与门外风景弹窗。
import '@fontsource/pixelify-sans/latin-500.css';
import '@fontsource/cinzel/latin-500.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/eb-garamond';
import '@fontsource-variable/eb-garamond/wght-italic.css';
import './style.css';
import { mountMusic } from './music';
import { mountReadingPanel } from './readingPanel';
import { mountStudy, type SceneManifest } from './study';
import studySceneData from './study-scene.json';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}

function mountDoorDialog(dialog: HTMLDialogElement) {
  const closeButton = dialog.querySelector<HTMLButtonElement>('#close-door');
  const shell = dialog.querySelector<HTMLElement>('.scroll-shell');
  if (!closeButton || !shell) throw new Error('Missing door dialog structure');

  let trigger: HTMLElement | null = null;

  document.querySelectorAll<HTMLButtonElement>('[data-open-door]').forEach((button) => {
    button.addEventListener('click', () => {
      trigger = button;
      if (!dialog.open) dialog.showModal();
    });
  });

  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = shell.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    trigger?.focus({ preventScroll: true });
    trigger = null;
  });
}

const scene = element('study-scene');
const art = element('study-art');
mountStudy(scene, art, studySceneData as SceneManifest);
mountMusic(element<HTMLAudioElement>('study-music'), element<HTMLButtonElement>('music-toggle'));
mountReadingPanel(element<HTMLDialogElement>('section-dialog'));
mountDoorDialog(element<HTMLDialogElement>('door-dialog'));
