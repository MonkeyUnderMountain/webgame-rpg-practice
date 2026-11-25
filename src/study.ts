// 换插图或调整点击范围时改这里。热点的左、上、宽、高都是整幅原图的百分比。
const studyImage = { width: 1672, height: 941 };
const studyHotspots = [
  { id: 'profile', label: 'About', x: 4.30622, y: 49.30925, width: 34.33014, height: 30.60574 },
  { id: 'notes', label: 'Notes', x: 38.75598, y: 11.26461, width: 18.60048, height: 57.38576 },
  { id: 'news', label: 'News', x: 14.83254, y: 15.72795, width: 23.74402, height: 33.26249 },
  { id: 'quests', label: 'Side Quests', x: 57.41627, y: 39.63868, width: 21.11244, height: 30.60574 },
  { id: 'door', label: 'Enter', x: 79.54545, y: 6.58874, width: 20.21531, height: 76.40808 },
] as const;



// 链接和房门叠在同一张底图上；之后移动整张图就能一起移动它们。
export function mountStudy(scene: HTMLElement, art: HTMLElement) {
  const artRoot = `${import.meta.env.BASE_URL}art/study/`;
  scene.style.setProperty('--study-ratio', `${studyImage.width} / ${studyImage.height}`);
  const image = new Image(studyImage.width, studyImage.height);
  image.src = `${artRoot}study.png`;
  image.alt = '';
  image.className = 'study-image';
  image.draggable = false;
  image.fetchPriority = 'high';
  image.addEventListener('error', () => {
    const notice = document.getElementById('study-art-error');
    if (notice) notice.hidden = false;
  });
  art.append(image);

  for (const spot of studyHotspots) {
    const hotspot = document.createElement(spot.id === 'door' ? 'button' : 'a');
    hotspot.className = `study-hotspot hotspot-${spot.id}`;
    hotspot.id = spot.id === 'door' ? 'door' : `hotspot-${spot.id}`;
    hotspot.setAttribute('aria-label', spot.label);
    if (hotspot instanceof HTMLAnchorElement) {
      hotspot.href = `#${spot.id}`;
      hotspot.dataset.section = spot.id;
    } else {
      hotspot.setAttribute('type', 'button');
      hotspot.setAttribute('data-enter-world', '');
    }
    Object.assign(hotspot.style, {
      left: `${spot.x}%`, top: `${spot.y}%`,
      width: `${spot.width}%`, height: `${spot.height}%`,
    });
    const outline = new Image();
    outline.src = `${artRoot}outlines/${spot.id}.png`;
    outline.alt = '';
    outline.className = 'hotspot-outline';
    outline.draggable = false;
    const caption = document.createElement('span');
    caption.className = 'hotspot-label';
    caption.textContent = spot.label;
    hotspot.append(outline, caption);
    art.append(hotspot);
  }

  const resize = () => fitStudyToScene(scene, art);
  new ResizeObserver(resize).observe(scene);
  resize();
}



// 热点在原图中的最外围边界固定，窗口缩放时只需重新计算画布的位置和比例。
const hotspotBounds = {
  left: Math.min(...studyHotspots.map(spot => spot.x)) / 100 * studyImage.width,
  right: Math.max(...studyHotspots.map(spot => spot.x + spot.width)) / 100 * studyImage.width,
  top: Math.min(...studyHotspots.map(spot => spot.y)) / 100 * studyImage.height,
  bottom: Math.max(...studyHotspots.map(spot => spot.y + spot.height)) / 100 * studyImage.height,
};
const desktopInsets = { side: 24, top: 104, bottom: 52 };

function fitStudyToScene(scene: HTMLElement, art: HTMLElement) {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (!width || !height) return;

  // 手机上完整显示原图。桌面尽量铺满，同时给导航、页脚和两侧留出空间。
  let scale = Math.min(width / studyImage.width, height / studyImage.height);
  const desktop = !window.matchMedia('(max-width: 760px)').matches;
  if (desktop) {
    const cover = Math.max(width / studyImage.width, height / studyImage.height);
    const fitHotspots = Math.min(
      (width - 2 * desktopInsets.side) / (hotspotBounds.right - hotspotBounds.left),
      (height - desktopInsets.top - desktopInsets.bottom) / (hotspotBounds.bottom - hotspotBounds.top),
    );
    scale = Math.min(cover, Math.max(0.1, fitHotspots));
  }

  const artWidth = studyImage.width * scale;
  const artHeight = studyImage.height * scale;
  let left = (width - artWidth) / 2;
  let top = (height - artHeight) / 2;
  if (desktop) {
    const leftLimit = desktopInsets.side - hotspotBounds.left * scale;
    const rightLimit = width - desktopInsets.side - hotspotBounds.right * scale;
    const topLimit = desktopInsets.top - hotspotBounds.top * scale;
    const bottomLimit = height - desktopInsets.bottom - hotspotBounds.bottom * scale;
    left = Math.max(leftLimit, Math.min(left, rightLimit));
    top = Math.max(topLimit, Math.min(top, bottomLimit));
  }
  Object.assign(art.style, {
    width: `${artWidth}px`, height: `${artHeight}px`,
    left: `${left}px`, top: `${top}px`,
  });
}
