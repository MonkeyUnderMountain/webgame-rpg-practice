import hotspotData from './study-hotspots.json';
import sceneData from './study-scene.json';
import {
  contoursToPath, decodeMask, lookupMask, maskFromAlpha, stampMask, traceLabel,
  type Contour, type MaskData, type Rgb,
} from './hotspotMask';

// 基准网格 960×540（与 study-master.aseprite 及 hotspots.png 一致），底图与零件导出为 2× (1920×1080)。
const studyBase = { width: sceneData.baseWidth, height: sceneData.baseHeight };
const studyExport = { width: sceneData.exportWidth, height: sceneData.exportHeight };
const studyGrid = { width: 557, height: 313 };

type Point = [number, number];
type SectionHotspotId = 'profile' | 'notes' | 'news' | 'research' | 'quests' | 'door';
type HotspotId = SectionHotspotId | string;

type HotspotDefinition = {
  id: HotspotId;
  label: string;
  key: number;
  priority: number;
  labelBelow?: boolean;
  outline: 'all' | 'largest';
  kind: 'section' | 'door' | 'prop';
};

type PropStateSpec = {
  id: string;
  src: string;
  frames: number;
  frameDurationMs: number;
  fxActive?: boolean;
  caption?: string;
};

type PropActionSpec = {
  type: 'toggle-state' | 'cycle-target';
  fxSelector?: string;
  targetProp?: string;
  storageKey?: string;
};

type PropSpec = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  interactive?: boolean;
  priority?: number;
  labelBelow?: boolean;
  outline?: 'all' | 'largest';
  action?: PropActionSpec;
  defaultState: string;
  states: PropStateSpec[];
};

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

const sectionDefinitions: HotspotDefinition[] = [
  { id: 'profile', label: 'About', key: 3, priority: 6, outline: 'all', kind: 'section' },
  { id: 'notes', label: 'Notes', key: 4, priority: 4, labelBelow: true, outline: 'largest', kind: 'section' },
  { id: 'news', label: 'News', key: 1, priority: 2, labelBelow: true, outline: 'all', kind: 'section' },
  { id: 'research', label: 'Research', key: 2, priority: 3, labelBelow: true, outline: 'all', kind: 'section' },
  { id: 'quests', label: 'Side Quests', key: 5, priority: 5, outline: 'all', kind: 'section' },
  { id: 'door', label: 'Look outside', key: 6, priority: 1, labelBelow: true, outline: 'all', kind: 'door' },
];

const sceneProps = (sceneData.props ?? []) as PropSpec[];
const interactiveProps = sceneProps
  .filter((prop) => prop.interactive)
  .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));

const propDefinitions: HotspotDefinition[] = interactiveProps.map((prop, index) => ({
  id: prop.id,
  label: prop.label,
  key: 7 + index,
  priority: prop.priority ?? (10 + index),
  labelBelow: prop.labelBelow,
  outline: prop.outline ?? 'all',
  kind: 'prop',
}));

const allDefinitions: HotspotDefinition[] = [...sectionDefinitions, ...propDefinitions];

const hotspotSource = hotspotData as Record<string, { color: number[]; polygons: number[][][] }>;
const extraDebugColors: Rgb[] = [
  [255, 230, 105],
  [122, 255, 212],
  [255, 166, 77],
  [196, 255, 110],
  [140, 195, 255],
];
const colors: Rgb[] = [
  [0, 0, 0],
  ...[1, 2, 3, 4, 5, 6].map((key) => hotspotSource[String(key)].color as Rgb),
  ...propDefinitions.map((_, idx) => extraDebugColors[idx % extraDebugColors.length]),
];

const labelToId = new Map<number, HotspotId>(
  allDefinitions.map((definition) => [definition.key, definition.id]),
);
const definitionsById = new Map<HotspotId, HotspotDefinition>(
  allDefinitions.map((definition) => [definition.id, definition]),
);



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

function toArtPath(polygons: Point[][]): string {
  const scaleX = studyBase.width / studyGrid.width;
  const scaleY = studyBase.height / studyGrid.height;
  return polygons
    .map((polygon) => `M ${polygon.map(([x, y]) => `${Math.round(x * scaleX)} ${Math.round(y * scaleY)}`).join(' L ')} Z`)
    .join(' ');
}

function toRectPath(x: number, y: number, width: number, height: number): string {
  return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
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

const studyHotspots = sectionDefinitions.map((definition) => {
  const source = hotspotSource[String(definition.key)];
  const polygons = source.polygons as Point[][];
  const bounds = boundsOf(polygons);
  return {
    ...definition,
    x: (bounds.minX / studyGrid.width) * 100,
    y: (bounds.minY / studyGrid.height) * 100,
    width: ((bounds.maxX - bounds.minX) / studyGrid.width) * 100,
    height: ((bounds.maxY - bounds.minY) / studyGrid.height) * 100,
    clipPath: toClipPath(polygons[0], bounds),
    fallbackPath: toArtPath(polygons),
  };
});

const propHotspots = interactiveProps.map((prop) => {
  const definition = definitionsById.get(prop.id)!;
  return {
    ...definition,
    prop,
    x: (prop.x / studyBase.width) * 100,
    y: (prop.y / studyBase.height) * 100,
    width: (prop.width / studyBase.width) * 100,
    height: (prop.height / studyBase.height) * 100,
    clipPath: 'none',
    fallbackPath: toRectPath(prop.x, prop.y, prop.width, prop.height),
  };
});



function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const result = new Image();
    result.decoding = 'async';
    result.onload = () => resolve(result);
    result.onerror = () => reject(new Error(`Could not load ${src}`));
    result.src = src;
  });
}

function idle(callback: () => void) {
  const ric = (window as unknown as {
    requestIdleCallback?: (run: () => void, options?: { timeout: number }) => number;
  }).requestIdleCallback;
  if (ric) ric(callback, { timeout: 1200 });
  else window.setTimeout(callback, 120);
}

function readStorage(key?: string): string | null {
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string | undefined, value: string) {
  if (!key) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 忽略隐私模式或禁用存储时的写入错误
  }
}



// 链接、房门与可替换像素零件叠在同一张 960×540 逻辑画布上；缩放时热点、轮廓和标签同步缩放。
export function mountStudy(scene: HTMLElement, art: HTMLElement) {
  const artRoot = `${import.meta.env.BASE_URL}art/study/mage/`;
  const svgNs = 'http://www.w3.org/2000/svg';
  scene.style.setProperty('--study-ratio', `${studyBase.width} / ${studyBase.height}`);

  const image = new Image(studyExport.width, studyExport.height);
  image.src = `${artRoot}${sceneData.background}`;
  image.alt = '';
  image.className = 'study-image';
  image.draggable = false;
  image.fetchPriority = 'high';
  image.addEventListener('error', () => {
    const notice = document.getElementById('study-art-error');
    if (notice) notice.hidden = false;
  });
  art.append(image);

  // 模块化像素零件层（黑板可切换数学图示、4 帧跳动烛火与粉笔槽等独立 PNG 零件）
  const propsLayer = document.createElement('div');
  propsLayer.className = 'study-props';
  propsLayer.setAttribute('aria-hidden', 'true');
  art.append(propsLayer);

  // 环境光效：烛光、窗光、星点和灰尘。烛光可由蜡烛微交互点亮或吹灭。
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

  // 挂载每个模块化零件及其状态精灵图
  type MountedProp = {
    spec: PropSpec;
    activeState: string;
    stateImages: Map<string, HTMLImageElement>;
    setState: (stateId: string, persist?: boolean) => void;
  };
  const mountedProps = new Map<string, MountedProp>();
  const captions = new Map<HotspotId, HTMLElement>();
  const anchors = new Map<HotspotId, HTMLAnchorElement | HTMLButtonElement>();
  const wrappers = new Map<HotspotId, HTMLElement>();

  for (const prop of sceneProps) {
    const propEl = document.createElement('div');
    propEl.className = `study-prop study-prop-${prop.id}`;
    propEl.dataset.propId = prop.id;
    Object.assign(propEl.style, {
      left: `${(prop.x / studyBase.width) * 100}%`,
      top: `${(prop.y / studyBase.height) * 100}%`,
      width: `${(prop.width / studyBase.width) * 100}%`,
      height: `${(prop.height / studyBase.height) * 100}%`,
      zIndex: String(prop.zIndex),
    });

    const stateImages = new Map<string, HTMLImageElement>();
    for (const st of prop.states) {
      const sprite = new Image();
      sprite.src = `${artRoot}${st.src}`;
      sprite.alt = '';
      sprite.draggable = false;
      sprite.className = `study-prop-sprite${st.frames > 1 ? ' is-animated' : ''}`;
      sprite.dataset.state = st.id;
      if (st.frames > 1) {
        sprite.style.setProperty('--frames', String(st.frames));
        sprite.style.setProperty('--anim-duration', `${st.frames * st.frameDurationMs}ms`);
      }
      sprite.hidden = st.id !== prop.defaultState;
      propEl.append(sprite);
      stateImages.set(st.id, sprite);
    }

    const saved = readStorage(prop.action?.storageKey);
    const initialState = prop.states.some((s) => s.id === saved) ? saved! : prop.defaultState;

    const setState = (nextStateId: string, persist = false) => {
      const stateSpec = prop.states.find((s) => s.id === nextStateId);
      if (!stateSpec) return;
      const entry = mountedProps.get(prop.id);
      if (entry) entry.activeState = nextStateId;
      for (const [id, img] of stateImages) {
        img.hidden = id !== nextStateId;
      }
      if (prop.action?.fxSelector && stateSpec.fxActive !== undefined) {
        const fxNode = ambient.querySelector<HTMLElement>(prop.action.fxSelector);
        if (fxNode) fxNode.classList.toggle('is-off', !stateSpec.fxActive);
      }
      if (prop.action?.type === 'toggle-state') {
        const btn = anchors.get(prop.id);
        const cap = captions.get(prop.id);
        const isLit = nextStateId === 'lit';
        if (btn) btn.setAttribute('aria-pressed', String(isLit));
        if (cap) cap.textContent = `${prop.label} · ${isLit ? 'Lit' : 'Out'}`;
      }
      if (persist) {
        writeStorage(prop.action?.storageKey, nextStateId);
      }
    };

    propsLayer.append(propEl);
    mountedProps.set(prop.id, { spec: prop, activeState: initialState, stateImages, setState });
    setState(initialState, false);
  }

  // 若某个零件带有 targetProp（如粉笔槽切换黑板公式），同步恢复目标零件的存储状态与标签提示
  function syncCycleTargetCaption(prop: PropSpec) {
    if (prop.action?.type !== 'cycle-target' || !prop.action.targetProp) return;
    const target = mountedProps.get(prop.action.targetProp);
    if (!target) return;
    const activeSpec = target.spec.states.find((s) => s.id === target.activeState);
    const cap = captions.get(prop.id);
    if (cap && activeSpec?.caption) {
      cap.textContent = `${prop.label} (${activeSpec.caption})`;
    }
  }

  for (const prop of sceneProps) {
    if (prop.action?.type === 'cycle-target' && prop.action.targetProp) {
      const target = mountedProps.get(prop.action.targetProp);
      const saved = readStorage(prop.action.storageKey);
      if (target && saved && target.spec.states.some((s) => s.id === saved)) {
        target.setState(saved, false);
      }
    }
  }

  // 轮廓用 SVG 路径，和 Aseprite 主工程共享 960×540 基准像素坐标。
  const outlineMap = document.createElementNS(svgNs, 'svg');
  outlineMap.setAttribute('class', 'study-outline-map');
  outlineMap.setAttribute('viewBox', `0 0 ${studyBase.width} ${studyBase.height}`);
  outlineMap.setAttribute('preserveAspectRatio', 'none');
  outlineMap.setAttribute('aria-hidden', 'true');
  const shapes = new Map<HotspotId, SVGPathElement>();

  for (const spot of [...studyHotspots, ...propHotspots]) {
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('class', `hotspot-shape hotspot-shape-${spot.id}`);
    path.setAttribute('data-hotspot', spot.id);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('d', spot.fallbackPath);
    outlineMap.append(path);
    shapes.set(spot.id, path);
  }
  art.append(outlineMap);

  // 创建 6 大栏目热点与场景内微交互零件按钮
  for (const spot of [...studyHotspots, ...propHotspots]) {
    const wrap = document.createElement('div');
    wrap.className = `hotspot-wrap hotspot-${spot.id}${spot.labelBelow ? ' label-below' : ''}`;
    Object.assign(wrap.style, {
      left: `${spot.x}%`, top: `${spot.y}%`,
      width: `${spot.width}%`, height: `${spot.height}%`,
      zIndex: String(spot.priority + 3),
    });

    const isLink = spot.kind === 'section';
    const hotspot = document.createElement(isLink ? 'a' : 'button');
    hotspot.className = 'study-hotspot';
    hotspot.id = spot.id === 'door' ? 'door' : `hotspot-${spot.id}`;
    hotspot.setAttribute('aria-label', spot.label);
    hotspot.setAttribute('data-hotspot', spot.id);
    if (spot.clipPath !== 'none') {
      hotspot.style.clipPath = spot.clipPath;
    }

    if (hotspot instanceof HTMLAnchorElement) {
      hotspot.href = `#${spot.id}`;
      hotspot.dataset.section = spot.id;
    } else {
      hotspot.type = 'button';
      if (spot.kind === 'door') {
        hotspot.setAttribute('data-open-door', '');
      }
    }

    const caption = document.createElement('span');
    caption.className = 'hotspot-label';
    caption.textContent = spot.label;

    hotspot.addEventListener('focus', () => {
      focused = spot.id;
      syncActive();
    });
    hotspot.addEventListener('blur', () => {
      if (focused === spot.id) focused = undefined;
      syncActive();
    });
    hotspot.addEventListener('pointerenter', () => {
      if (art.classList.contains('has-hit-layer')) return;
      hovered = spot.id;
      syncActive();
    });
    hotspot.addEventListener('pointerleave', () => {
      if (art.classList.contains('has-hit-layer')) return;
      if (hovered === spot.id) hovered = undefined;
      syncActive();
    });

    if (spot.kind === 'prop') {
      const prop = (spot as typeof propHotspots[number]).prop;
      hotspot.addEventListener('click', (event) => {
        event.preventDefault();
        const mounted = mountedProps.get(prop.id);
        if (!mounted || !prop.action) return;

        if (prop.action.type === 'toggle-state' && prop.states.length >= 2) {
          const currentIdx = prop.states.findIndex((s) => s.id === mounted.activeState);
          const nextState = prop.states[(currentIdx + 1) % prop.states.length];
          mounted.setState(nextState.id, true);
        } else if (prop.action.type === 'cycle-target' && prop.action.targetProp) {
          const target = mountedProps.get(prop.action.targetProp);
          if (!target) return;
          const currentIdx = target.spec.states.findIndex((s) => s.id === target.activeState);
          const nextState = target.spec.states[(currentIdx + 1) % target.spec.states.length];
          target.setState(nextState.id, false);
          writeStorage(prop.action.storageKey, nextState.id);
          syncCycleTargetCaption(prop);
        }
      });
    }

    wrap.append(hotspot, caption);
    art.append(wrap);
    anchors.set(spot.id, hotspot);
    wrappers.set(spot.id, wrap);
    captions.set(spot.id, caption);
  }

  // 初始化微交互按钮的动态标签文本
  for (const prop of interactiveProps) {
    const mounted = mountedProps.get(prop.id);
    if (mounted && prop.action?.type === 'toggle-state') {
      mounted.setState(mounted.activeState, false);
    } else if (prop.action?.type === 'cycle-target') {
      syncCycleTargetCaption(prop);
    }
  }

  let hovered: HotspotId | undefined;
  let focused: HotspotId | undefined;
  let active: HotspotId | undefined;

  function setActive(id: HotspotId | undefined) {
    if (id === active) return;
    if (active) {
      shapes.get(active)?.classList.remove('is-active');
      wrappers.get(active)?.classList.remove('is-active');
    }
    active = id;
    if (active) {
      shapes.get(active)?.classList.add('is-active');
      wrappers.get(active)?.classList.add('is-active');
    }
  }

  function syncActive() {
    setActive(hovered ?? focused);
  }

  function activate(id: HotspotId) {
    const anchor = anchors.get(id);
    if (!anchor) return;
    anchor.focus({ preventScroll: true });
    anchor.click();
  }

  const resize = () => fitStudyToScene(scene, art);
  new ResizeObserver(resize).observe(scene);
  resize();

  // 初次进入书房时，用一次轻柔的微光扫过物件轮廓，提示房间里的物件可以点击。
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const playIntroHint = () => {
      const order: HotspotId[] = ['news', 'research', 'profile', 'notes', 'quests', 'door'];
      order.forEach((id, index) => {
        const path = shapes.get(id);
        if (!path) return;
        path.style.animationDelay = `${450 + index * 110}ms`;
        path.classList.add('is-hint');
        path.addEventListener('animationend', () => {
          path.classList.remove('is-hint');
          path.style.animationDelay = '';
        }, { once: true });
      });
    };
    if (image.complete && image.naturalWidth > 0) playIntroHint();
    else image.addEventListener('load', playIntroHint, { once: true });
  }

  // 掩膜决定鼠标命中区域和金色轮廓：
  // 1) 六大栏目从 960×540 的 hotspots.png 解码并提取完整外轮廓；
  // 2) 独立拆出的可交互零件直接读取自身 PNG 的 Alpha > 16 通道自动合成命中区与 Marching Squares 金色描边。
  const contourCache = new Map<HotspotId, Contour[]>();
  const isolatedPropMasks = new Map<HotspotId, MaskData>();
  let baseMask: MaskData | undefined;
  let hitMask: MaskData | undefined;

  function ensureContours(id: HotspotId): Contour[] {
    const cached = contourCache.get(id);
    if (cached) return cached;
    const definition = definitionsById.get(id);
    if (!definition) return [];
    const sourceMask = definition.kind === 'prop' ? isolatedPropMasks.get(id) : baseMask;
    if (!sourceMask) return [];
    const contours = traceLabel(sourceMask, definition.key);
    contourCache.set(id, contours);
    const outline = definition.outline === 'largest' ? contours.slice(0, 1) : contours;
    if (outline.length > 0) {
      shapes.get(id)?.setAttribute('d', contoursToPath(outline));
    }
    return contours;
  }

  function hitAt(clientX: number, clientY: number): HotspotId | undefined {
    if (!hitMask) return undefined;
    const rect = art.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    const x = Math.floor((clientX - rect.left) / rect.width * studyBase.width);
    const y = Math.floor((clientY - rect.top) / rect.height * studyBase.height);
    // 容差按 960×540 基准像素换算，手机上不会因为整图缩小而变得难点。
    const radius = Math.min(14, Math.max(3, Math.round(5 * studyBase.width / rect.width)));
    return labelToId.get(lookupMask(hitMask, x, y, radius));
  }

  async function stampInteractiveProps(targetHitMask: MaskData) {
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    for (const spot of propHotspots) {
      const { prop } = spot;
      const defaultSpec = prop.states.find((s) => s.id === prop.defaultState) ?? prop.states[0];
      if (!defaultSpec) continue;
      try {
        const mounted = mountedProps.get(prop.id);
        const existingImg = mounted?.stateImages.get(defaultSpec.id);
        const propImg = (existingImg && existingImg.complete && existingImg.naturalWidth > 0)
          ? existingImg
          : await loadImage(`${artRoot}${defaultSpec.src}`);

        offscreen.width = prop.width;
        offscreen.height = prop.height;
        ctx.clearRect(0, 0, prop.width, prop.height);
        ctx.imageSmoothingEnabled = false;
        // 若是多帧横向精灵条带，只截取第 1 帧用于 Alpha 命中与轮廓提取
        const frameWidth = Math.floor(propImg.naturalWidth / Math.max(1, defaultSpec.frames));
        ctx.drawImage(
          propImg,
          0, 0, frameWidth, propImg.naturalHeight,
          0, 0, prop.width, prop.height,
        );
        const propData = ctx.getImageData(0, 0, prop.width, prop.height);
        const propMask = maskFromAlpha(
          propData,
          studyBase.width,
          studyBase.height,
          prop.x,
          prop.y,
          spot.key,
          16,
        );
        isolatedPropMasks.set(prop.id, propMask);
        stampMask(targetHitMask, propMask, spot.key);
        ensureContours(prop.id);
      } catch (err) {
        console.warn(`Could not extract Alpha mask for prop ${prop.id}:`, err);
      }
    }
  }

  void loadImage(`${artRoot}${sceneData.hotspotMask}`).then(async (maskImage) => {
    const canvas = document.createElement('canvas');
    canvas.width = studyBase.width;
    canvas.height = studyBase.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Missing 2D context');
    context.imageSmoothingEnabled = false;
    context.drawImage(maskImage, 0, 0, studyBase.width, studyBase.height);
    const decodedBase = decodeMask(context.getImageData(0, 0, studyBase.width, studyBase.height), colors);
    baseMask = decodedBase;
    hitMask = {
      width: decodedBase.width,
      height: decodedBase.height,
      labels: new Uint8Array(decodedBase.labels),
      bounds: decodedBase.bounds.map((b) => (b ? { ...b } : undefined)),
    };

    // 将可交互零件的 Alpha 通道自动合成到全局命中掩膜上，并生成各自的 Marching Squares 金色轮廓
    await stampInteractiveProps(hitMask);

    art.classList.add('has-hit-layer');

    // 鼠标/触屏命中层压在插图上；键盘仍然走原来的链接和按钮。
    const overlay = document.createElement('div');
    overlay.className = 'study-hit-layer';
    overlay.setAttribute('aria-hidden', 'true');

    let hoverFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let lastPointerType = 'mouse';

    const updateHover = () => {
      hoverFrame = 0;
      const id = hitAt(pointerX, pointerY);
      if (id === hovered) return;
      hovered = id;
      syncActive();
      overlay.style.cursor = id ? 'pointer' : '';
      if (id) ensureContours(id);
    };

    overlay.addEventListener('pointermove', (event) => {
      lastPointerType = event.pointerType;
      if (event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!hoverFrame) hoverFrame = requestAnimationFrame(updateHover);
    });
    overlay.addEventListener('pointerleave', () => {
      if (hoverFrame) cancelAnimationFrame(hoverFrame);
      hoverFrame = 0;
      hovered = undefined;
      syncActive();
      overlay.style.cursor = '';
    });
    overlay.addEventListener('pointerdown', (event) => {
      lastPointerType = event.pointerType;
      if (event.pointerType !== 'touch') return;
      const id = hitAt(event.clientX, event.clientY);
      if (!id) return;
      hovered = id;
      syncActive();
      ensureContours(id);
    });
    overlay.addEventListener('click', (event) => {
      const id = hitAt(event.clientX, event.clientY);
      if (!id) return;
      ensureContours(id);
      activate(id);
      if (lastPointerType === 'touch') {
        hovered = undefined;
        syncActive();
      }
    });
    art.append(overlay);

    // 空闲时逐个预追踪轮廓，避免第一次悬停时卡顿。
    let warmIndex = 0;
    const warm = () => {
      if (warmIndex >= allDefinitions.length) return;
      ensureContours(allDefinitions[warmIndex].id);
      warmIndex += 1;
      idle(warm);
    };
    idle(warm);

    if (new URLSearchParams(location.search).get('debug') === 'hotspots') {
      const debugCanvas = document.createElement('canvas');
      debugCanvas.width = studyBase.width;
      debugCanvas.height = studyBase.height;
      const debugContext = debugCanvas.getContext('2d');
      if (debugContext && hitMask) {
        const pixels = debugContext.createImageData(studyBase.width, studyBase.height);
        for (let i = 0; i < hitMask.labels.length; i += 1) {
          const label = hitMask.labels[i];
          if (!label) continue;
          const [r, g, b] = colors[label] ?? [255, 255, 255];
          pixels.data[i * 4] = r;
          pixels.data[i * 4 + 1] = g;
          pixels.data[i * 4 + 2] = b;
          pixels.data[i * 4 + 3] = 100;
        }
        debugContext.putImageData(pixels, 0, 0);
        debugCanvas.className = 'study-debug-mask';
        art.append(debugCanvas);
      }
      art.classList.add('debug-hotspots');
    }
  }).catch((error: unknown) => {
    // 掩膜不可用时保留旧多边形的悬停和点击，页面仍然可用。
    console.warn('Hotspot mask unavailable; using polygon fallback.', error);
  });
}



// 热点在 960×540 基准图中的最外围边界固定，窗口缩放时只需重新计算画布的位置和比例。
const hotspotBounds = {
  left: Math.min(...studyHotspots.map((spot) => spot.x)) / 100 * studyBase.width,
  right: Math.max(...studyHotspots.map((spot) => spot.x + spot.width)) / 100 * studyBase.width,
  top: Math.min(...studyHotspots.map((spot) => spot.y)) / 100 * studyBase.height,
  bottom: Math.max(...studyHotspots.map((spot) => spot.y + spot.height)) / 100 * studyBase.height,
};
const desktopInsets = { side: 0, top: 0, bottom: 0 };

function fitStudyToScene(scene: HTMLElement, art: HTMLElement) {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (!width || !height) return;

  // 手机上完整显示原图。桌面铺满画面，标题、导航和页脚叠在插图上。
  let scale = Math.min(width / studyBase.width, height / studyBase.height);
  const desktop = !window.matchMedia('(max-width: 760px)').matches;
  if (desktop) {
    const cover = Math.max(width / studyBase.width, height / studyBase.height);
    const fitHotspots = Math.min(
      (width - 2 * desktopInsets.side) / (hotspotBounds.right - hotspotBounds.left),
      (height - desktopInsets.top - desktopInsets.bottom) / (hotspotBounds.bottom - hotspotBounds.top),
    );
    scale = Math.min(cover, Math.max(0.1, fitHotspots));
  }

  const artWidth = studyBase.width * scale;
  const artHeight = studyBase.height * scale;
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
