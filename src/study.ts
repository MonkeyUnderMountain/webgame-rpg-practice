import hotspotData from './study-hotspots.json';

// 逻辑像素图是 557×313，首页底图是 1672×941；热点坐标保留逻辑像素。
// 换插图时先更新 studyImage 和 study-hotspots.json，再重新量多边形。
const studyImage = { width: 1672, height: 941 };
const studyGrid = { width: 557, height: 313 };

type Point = [number, number];
type HotspotId = 'profile' | 'notes' | 'news' | 'research' | 'quests' | 'door';
type HotspotDefinition = {
  id: HotspotId;
  label: string;
  key: string;
  priority: number;
  labelBelow?: boolean;
};
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const hotspotDefinitions: HotspotDefinition[] = [
  { id: 'profile', label: 'About', key: '3', priority: 6 },
  { id: 'notes', label: 'Notes', key: '4', priority: 4, labelBelow: true },
  { id: 'news', label: 'News', key: '1', priority: 2, labelBelow: true },
  { id: 'research', label: 'Research', key: '2', priority: 3, labelBelow: true },
  { id: 'quests', label: 'Side Quests', key: '5', priority: 5 },
  { id: 'door', label: 'Enter', key: '6', priority: 1, labelBelow: true },
];



function boundsOf(polygons: Point[][]): Bounds {
  const points = polygons.flat();
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    minY: Math.min(...ys),
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
  };
}

function toSvgPath(polygons: Point[][]): string {
  return polygons
    .map((polygon) => `M ${polygon.map(([x, y]) => `${x} ${y}`).join(' L ')} Z`)
    .join(' ');
}

function toClipPath(polygon: Point[], bounds: Bounds): string {
  const width = Math.max(1e-6, bounds.maxX - bounds.minX);
  const height = Math.max(1e-6, bounds.maxY - bounds.minY);
  const points = polygon.map(([x, y]) => {
    const px = ((x - bounds.minX) / width) * 100;
    const py = ((y - bounds.minY) / height) * 100;
    return `${px.toFixed(3)}% ${py.toFixed(3)}%`;
  });
  return `polygon(${points.join(', ')})`;
}

const studyHotspots = hotspotDefinitions.map((definition) => {
  const source = (hotspotData as Record<string, { polygons: number[][][] }>)[definition.key];
  const polygons = source.polygons as Point[][];
  const bounds = boundsOf(polygons);
  return {
    ...definition,
    polygons,
    x: (bounds.minX / studyGrid.width) * 100,
    y: (bounds.minY / studyGrid.height) * 100,
    width: ((bounds.maxX - bounds.minX) / studyGrid.width) * 100,
    height: ((bounds.maxY - bounds.minY) / studyGrid.height) * 100,
    clipPath: toClipPath(polygons[0], bounds),
    svgPath: toSvgPath(polygons),
  };
});



// 链接和房门叠在同一张底图上；底图缩放时热点、轮廓和标签一起缩放。
export function mountStudy(scene: HTMLElement, art: HTMLElement) {
  const artRoot = `${import.meta.env.BASE_URL}art/study/mage/`;
  const svgNs = 'http://www.w3.org/2000/svg';
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

  // 环境光效：烛光、窗光、星点和灰尘。它们不参与点击，只叠在底图上。
  const ambient = document.createElement('div');
  ambient.className = 'study-fx';
  ambient.setAttribute('aria-hidden', 'true');
  ambient.innerHTML = `
    <span class="fx-glow fx-candle fx-candle-desk"></span>
    <span class="fx-glow fx-candle fx-candle-column"></span>
    <span class="fx-glow fx-candle fx-candle-bench"></span>
    <span class="fx-glow fx-window"></span>
    <span class="fx-glow fx-door"></span>
    <span class="fx-star fx-star-1"></span>
    <span class="fx-star fx-star-2"></span>
    <span class="fx-star fx-star-3"></span>
    <span class="fx-dust fx-dust-1"></span>
    <span class="fx-dust fx-dust-2"></span>
    <span class="fx-dust fx-dust-3"></span>
    <span class="fx-dust fx-dust-4"></span>
    <span class="fx-dust fx-dust-5"></span>
  `;
  art.append(ambient);

  // 轮廓用 SVG 路径，和底图共享 557×313 的逻辑坐标。
  const outlineMap = document.createElementNS(svgNs, 'svg');
  outlineMap.setAttribute('class', 'study-outline-map');
  outlineMap.setAttribute('viewBox', `0 0 ${studyGrid.width} ${studyGrid.height}`);
  outlineMap.setAttribute('preserveAspectRatio', 'none');
  outlineMap.setAttribute('aria-hidden', 'true');
  const shapes = new Map<HotspotId, SVGPathElement>();
  for (const spot of studyHotspots) {
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('class', `hotspot-shape hotspot-shape-${spot.id}`);
    path.setAttribute('data-hotspot', spot.id);
    path.setAttribute('d', spot.svgPath);
    outlineMap.append(path);
    shapes.set(spot.id, path);
  }
  art.append(outlineMap);

  for (const spot of studyHotspots) {
    const wrap = document.createElement('div');
    wrap.className = `hotspot-wrap hotspot-${spot.id}${spot.labelBelow ? ' label-below' : ''}`;
    Object.assign(wrap.style, {
      left: `${spot.x}%`, top: `${spot.y}%`,
      width: `${spot.width}%`, height: `${spot.height}%`,
      zIndex: String(spot.priority),
    });

    const hotspot = document.createElement(spot.id === 'door' ? 'button' : 'a');
    hotspot.className = 'study-hotspot';
    hotspot.id = spot.id === 'door' ? 'door' : `hotspot-${spot.id}`;
    hotspot.setAttribute('aria-label', spot.label);
    hotspot.setAttribute('data-hotspot', spot.id);
    hotspot.style.clipPath = spot.clipPath;
    if (hotspot instanceof HTMLAnchorElement) {
      hotspot.href = `#${spot.id}`;
      hotspot.dataset.section = spot.id;
    } else {
      hotspot.type = 'button';
      hotspot.setAttribute('data-enter-world', '');
    }

    const caption = document.createElement('span');
    caption.className = 'hotspot-label';
    caption.textContent = spot.label;

    const activate = (active: boolean) => {
      shapes.get(spot.id)?.classList.toggle('is-active', active);
      wrap.classList.toggle('is-active', active);
    };
    hotspot.addEventListener('pointerenter', () => activate(true));
    hotspot.addEventListener('pointerleave', () => activate(false));
    hotspot.addEventListener('focus', () => activate(true));
    hotspot.addEventListener('blur', () => activate(false));

    wrap.append(hotspot, caption);
    art.append(wrap);
  }

  const resize = () => fitStudyToScene(scene, art);
  new ResizeObserver(resize).observe(scene);
  resize();
}



// 热点在原图中的最外围边界固定，窗口缩放时只需重新计算画布的位置和比例。
const hotspotBounds = {
  left: Math.min(...studyHotspots.map((spot) => spot.x)) / 100 * studyImage.width,
  right: Math.max(...studyHotspots.map((spot) => spot.x + spot.width)) / 100 * studyImage.width,
  top: Math.min(...studyHotspots.map((spot) => spot.y)) / 100 * studyImage.height,
  bottom: Math.max(...studyHotspots.map((spot) => spot.y + spot.height)) / 100 * studyImage.height,
};
const desktopInsets = { side: 0, top: 0, bottom: 0 };

function fitStudyToScene(scene: HTMLElement, art: HTMLElement) {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (!width || !height) return;

  // 手机上完整显示原图。桌面铺满画面，标题、导航和页脚叠在插图上。
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
