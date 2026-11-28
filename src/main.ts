// 页面入口：挂载书房插画、背景音乐、阅读卷轴与门外风景弹窗。
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
import mageSceneData from './study-scene.json';
import sideSceneData from './study-side-scene.json';

const sideViewImages = import.meta.glob<{ default: string }>(
  ['../artwork/study/side-view/reference.jpg', '../artwork/study/side-view/variants/*'],
);

type SideStyleSpec = {
  id: string;
  label: string;
  assetPath?: string;
};

const SIDE_STYLES: SideStyleSpec[] = [
  { id: 'interactive', label: 'Pixel study · 640×360 (default)' },
  {
    id: 'tiled-960',
    label: 'Original tiled room · 960×540',
    assetPath: '../artwork/study/side-view/variants/study-side-view-tiled-960.png',
  },
  {
    id: 'stone-wide-board',
    label: 'Reference · sunlit study',
    assetPath: '../artwork/study/side-view/reference.jpg',
  },
  {
    id: 'stone',
    label: "Mage's stone study",
    assetPath: '../artwork/study/side-view/variants/study-side-view-stone-sanctum.jpg',
  },
  {
    id: 'stone-workstation',
    label: 'Stone workstation · dusk',
    assetPath: '../artwork/study/side-view/variants/study-side-view-stone-workstation.png',
  },
  {
    id: 'stone-sunlit',
    label: 'Stone workstation · sunny day',
    assetPath: '../artwork/study/side-view/variants/study-side-view-stone-workstation-sunlit.jpg',
  },
  {
    id: 'daylight',
    label: 'Daylight study',
    assetPath: '../artwork/study/side-view/variants/study-side-view-detailed-daylight.jpg',
  },
  {
    id: 'moon',
    label: 'Moonlit observatory',
    assetPath: '../artwork/study/side-view/variants/study-side-view-moon.jpg',
  },
  {
    id: 'herbal',
    label: 'Rainy herbarium',
    assetPath: '../artwork/study/side-view/variants/study-side-view-herbal.jpg',
  },
  {
    id: 'ember',
    label: 'Ember runes',
    assetPath: '../artwork/study/side-view/variants/study-side-view-ember.jpg',
  },
];

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

function mountSideRoom(scene: HTMLElement, art: HTMLElement) {
  const select = element<HTMLSelectElement>('room-style');
  const notice = element('study-art-error');
  for (const style of SIDE_STYLES) {
    select.add(new Option(style.label, style.id));
  }

  const requestedStyle = new URLSearchParams(location.search).get('style');
  const activeStyle = SIDE_STYLES.find((item) => item.id === requestedStyle) ?? SIDE_STYLES[0];
  const isInteractive = activeStyle.id === 'interactive';

  const showStaticStyle = async (image: HTMLImageElement, style: SideStyleSpec) => {
    notice.hidden = true;
    const loader = style.assetPath ? sideViewImages[style.assetPath] : undefined;
    if (!loader) {
      notice.hidden = false;
      return;
    }
    try {
      const mod = await loader();
      if (select.value !== style.id) return;
      const originalRoom = style.id === 'tiled-960';
      image.classList.toggle('study-image', originalRoom);
      image.alt = originalRoom ? style.label : `${style.label}: side view of the study with a chalkboard, desk and valley window`;
      image.src = mod.default;
    } catch {
      if (select.value === style.id) notice.hidden = false;
    }
  };

  select.value = activeStyle.id;
  if (isInteractive) {
    mountStudy(scene, art, sideSceneData as SceneManifest);
  } else {
    const image = new Image();
    image.addEventListener('error', () => { notice.hidden = false; });
    scene.classList.add('side-preview');
    scene.setAttribute('aria-label', 'Side-view study preview');
    art.append(image);

    void showStaticStyle(image, activeStyle);
  }

  select.addEventListener('change', () => {
    const next = SIDE_STYLES.find((item) => item.id === select.value) ?? SIDE_STYLES[0];
    const url = new URL(location.href);
    if (next.id === 'interactive') url.searchParams.delete('style');
    else url.searchParams.set('style', next.id);

    const switchingMode = isInteractive !== (next.id === 'interactive');
    if (switchingMode) {
      location.assign(url.toString());
      return;
    }

    history.replaceState(null, '', url);
    const image = art.querySelector('img');
    if (!isInteractive && image) void showStaticStyle(image, next);
  });

  element('room-picker').hidden = false;
}

const scene = element('study-scene');
const art = element('study-art');
if (new URLSearchParams(location.search).get('room') === 'side') {
  mountSideRoom(scene, art);
} else {
  mountStudy(scene, art, mageSceneData as SceneManifest);
}
mountMusic(element<HTMLAudioElement>('study-music'), element<HTMLButtonElement>('music-toggle'));
mountReadingPanel(element<HTMLDialogElement>('section-dialog'));
mountDoorDialog(element<HTMLDialogElement>('door-dialog'));
