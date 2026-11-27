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
import { mountStudy } from './study';
import sideViewReference from '../artwork/study/side-view/reference.jpg';
import stone from '../artwork/study/side-view/variants/study-side-view-stone-sanctum.jpg';
import stoneWorkstation from '../artwork/study/side-view/variants/study-side-view-stone-workstation.png';
import sunlitWorkstation from '../artwork/study/side-view/variants/study-side-view-stone-workstation-sunlit.jpg';
import daylight from '../artwork/study/side-view/variants/study-side-view-detailed-daylight.jpg';
import moon from '../artwork/study/side-view/variants/study-side-view-moon.jpg';
import herbal from '../artwork/study/side-view/variants/study-side-view-herbal.jpg';
import ember from '../artwork/study/side-view/variants/study-side-view-ember.jpg';



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



function mountSidePreview(scene: HTMLElement, art: HTMLElement) {
  const styles = [
    { id: 'stone-wide-board', label: 'Reference · sunlit study', src: sideViewReference },
    { id: 'stone', label: "Mage's stone study", src: stone },
    { id: 'stone-workstation', label: 'Stone workstation · dusk', src: stoneWorkstation },
    { id: 'stone-sunlit', label: 'Stone workstation · sunny day', src: sunlitWorkstation },
    { id: 'daylight', label: 'Daylight study', src: daylight },
    { id: 'moon', label: 'Moonlit observatory', src: moon },
    { id: 'herbal', label: 'Rainy herbarium', src: herbal },
    { id: 'ember', label: 'Ember runes', src: ember },
  ];
  const select = element<HTMLSelectElement>('room-style');
  const notice = element('study-art-error');
  const image = new Image();
  image.addEventListener('error', () => { notice.hidden = false; });
  scene.classList.add('side-preview');
  scene.setAttribute('aria-label', 'Side-view study preview');
  art.append(image);

  for (const style of styles) select.add(new Option(style.label, style.id));
  function showStyle(id: string | null) {
    const style = styles.find((item) => item.id === id) ?? styles[0];
    notice.hidden = true;
    select.value = style.id;
    image.alt = `${style.label}: side view of the study with a chalkboard, desk and valley window`;
    image.src = style.src;
  }
  showStyle(new URLSearchParams(location.search).get('style'));
  select.addEventListener('change', () => {
    showStyle(select.value);
    const url = new URL(location.href);
    url.searchParams.set('style', select.value);
    history.replaceState(null, '', url);
  });
  element('room-picker').hidden = false;
}

// 侧视预览只展示插画；原书房仍使用零件、热点和动画。
const scene = element('study-scene');
const art = element('study-art');
if (new URLSearchParams(location.search).get('room') === 'side') {
  mountSidePreview(scene, art);
} else {
  mountStudy(scene, art);
}
mountMusic(element<HTMLAudioElement>('study-music'), element<HTMLButtonElement>('music-toggle'));
mountReadingPanel(element<HTMLDialogElement>('section-dialog'));
mountDoorDialog(element<HTMLDialogElement>('door-dialog'));
