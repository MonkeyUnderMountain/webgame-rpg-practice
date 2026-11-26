import profile from '../content/home/profile.html?raw';
import notes from '../content/home/notes.html?raw';
import news from '../content/home/news.html?raw';
import research from '../content/home/research.html?raw';
import quests from '../content/home/quests.html?raw';



// 书房物件、导航和网址锚点共用栏目 ID。正文直接编辑对应的 HTML。
const sections = { profile, notes, news, research, quests };
type SectionId = keyof typeof sections;

function isSectionId(id: string | undefined): id is SectionId {
  return id !== undefined && Object.hasOwn(sections, id);
}

function sectionFromHash(): SectionId | undefined {
  const id = location.hash.slice(1);
  return isSectionId(id) ? id : undefined;
}



// 点击链接会添加历史记录。处理直接访问、后退和前进时，只同步面板。
export function mountReadingPanel(dialog: HTMLDialogElement) {
  const body = dialog.querySelector<HTMLElement>('#section-body');
  const sheet = dialog.querySelector<HTMLElement>('.scroll-sheet');
  const shell = dialog.querySelector<HTMLElement>('.scroll-shell');
  const closeButton = dialog.querySelector<HTMLButtonElement>('#close-section');
  if (!body || !sheet || !shell || !closeButton) throw new Error('Missing reading panel elements');
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-section]');

  function markCurrentSection(id?: SectionId) {
    for (const link of links) {
      if (link.dataset.section === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  }

  const showSection = (id: SectionId) => {
    body.innerHTML = sections[id];
    if (!dialog.open) dialog.showModal();
    sheet.scrollTop = 0;
    markCurrentSection(id);
  };

  function syncWithLocation() {
    const id = sectionFromHash();
    if (id) showSection(id);
    else if (dialog.open) dialog.close();
  }

  for (const link of links) {
    const id = link.dataset.section;
    if (!isSectionId(id)) continue;
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (sectionFromHash() !== id) history.pushState(null, '', `#${id}`);
      showSection(id);
    });
  }
  window.addEventListener('hashchange', syncWithLocation);
  window.addEventListener('popstate', syncWithLocation);



  // 原生 dialog 负责 Esc。点击遮罩或关闭按钮时同步清除网址锚点。
  closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = shell.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.open) return;
    if (sectionFromHash()) history.replaceState(null, '', `${location.pathname}${location.search}`);
    markCurrentSection();
  });

  syncWithLocation();
}
