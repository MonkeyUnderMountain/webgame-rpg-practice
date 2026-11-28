import defaultSceneData from './study-scene.json';
import {
  contoursToPath, decodeMask, lookupMask, maskFromAlpha, stampMask, traceLabel,
  type Contour, type MaskData, type Rgb,
} from './hotspotMask';

type HotspotId = string;

export type SectionSpec = {
  id: string;
  label: string;
  key: number;
  color: [number, number, number];
  x: number;
  y: number;
  width: number;
  height: number;
  priority: number;
  labelBelow?: boolean;
  outline: 'all' | 'largest';
};

export type PropStateSpec = {
  id: string;
  src: string;
  frames: number;
  frameDurationMs: number;
};

export type PropActionSpec = {
  type: 'read-note';
  text?: string;
};

export type PropSpec = {
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

export type SceneManifest = {
  artBase?: string;
  baseWidth: number;
  baseHeight: number;
  exportScale: number;
  exportWidth: number;
  exportHeight: number;
  background: string;
  hotspotMask: string;
  sections: SectionSpec[];
  props: PropSpec[];
};

type HotspotItem = {
  id: HotspotId;
  label: string;
  key: number;
  priority: number;
  labelBelow?: boolean;
  outline: 'all' | 'largest';
  kind: 'section' | 'door' | 'prop';
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  fallbackPath: string;
  prop?: PropSpec;
};

type BoundsRect = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

function toRectPath(x: number, y: number, width: number, height: number): string {
  return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
}

const propDebugColors: Rgb[] = [
  [255, 230, 105],
  [122, 255, 212],
  [255, 166, 77],
  [196, 255, 110],
  [140, 195, 255],
];

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

const DEFAULT_SECTION_SPECS: Array<{ key: number; color: Rgb }> = [
  { key: 1, color: [58, 215, 255] },
  { key: 2, color: [89, 226, 138] },
  { key: 3, color: [255, 210, 122] },
  { key: 4, color: [255, 154, 120] },
  { key: 5, color: [214, 140, 255] },
  { key: 6, color: [255, 122, 168] },
];

// 链接、房门与可替换像素零件叠在同一张 640×360 逻辑画布上；缩放时热点、轮廓和标签同步缩放。
export function mountStudy(
  scene: HTMLElement,
  art: HTMLElement,
  sceneData: SceneManifest = defaultSceneData as SceneManifest,
) {
  const studyBase = { width: sceneData.baseWidth, height: sceneData.baseHeight };
  const studyExport = { width: sceneData.exportWidth, height: sceneData.exportHeight };
  const artBase = sceneData.artBase ?? 'art/study/';
  const artRoot = `${import.meta.env.BASE_URL}${artBase}`;
  const svgNs = 'http://www.w3.org/2000/svg';

  const sceneSections = sceneData.sections ?? [];
  const sceneProps = sceneData.props ?? [];
  const interactiveProps = sceneProps
    .filter((prop) => prop.interactive)
    .sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));

  const sectionHotspots: HotspotItem[] = sceneSections.map((sec) => ({
    id: sec.id,
    label: sec.label,
    key: sec.key,
    priority: sec.priority,
    labelBelow: sec.labelBelow,
    outline: sec.outline,
    kind: sec.id === 'door' ? 'door' : 'section',
    xPercent: (sec.x / studyBase.width) * 100,
    yPercent: (sec.y / studyBase.height) * 100,
    widthPercent: (sec.width / studyBase.width) * 100,
    heightPercent: (sec.height / studyBase.height) * 100,
    fallbackPath: toRectPath(sec.x, sec.y, sec.width, sec.height),
  }));

  const maxSectionKey = sceneSections.reduce((max, sec) => Math.max(max, sec.key), 6);
  const propHotspots: HotspotItem[] = interactiveProps.map((prop, index) => ({
    id: prop.id,
    label: prop.label,
    key: maxSectionKey + 1 + index,
    priority: prop.priority ?? (10 + index),
    labelBelow: prop.labelBelow,
    outline: prop.outline ?? 'all',
    kind: 'prop',
    xPercent: (prop.x / studyBase.width) * 100,
    yPercent: (prop.y / studyBase.height) * 100,
    widthPercent: (prop.width / studyBase.width) * 100,
    heightPercent: (prop.height / studyBase.height) * 100,
    fallbackPath: toRectPath(prop.x, prop.y, prop.width, prop.height),
    prop,
  }));

  const allHotspots: HotspotItem[] = [...sectionHotspots, ...propHotspots];

  const colors: Rgb[] = [[0, 0, 0]];
  for (const spec of DEFAULT_SECTION_SPECS) {
    colors[spec.key] = spec.color;
  }
  for (const sec of sceneSections) {
    colors[sec.key] = sec.color;
  }
  propHotspots.forEach((spot, index) => {
    colors[spot.key] = propDebugColors[index % propDebugColors.length];
  });

  const labelToId = new Map<number, HotspotId>(
    allHotspots.map((spot) => [spot.key, spot.id]),
  );
  const hotspotsById = new Map<HotspotId, HotspotItem>(
    allHotspots.map((spot) => [spot.id, spot]),
  );

  const hotspotBounds: BoundsRect = sectionHotspots.length > 0
    ? {
        left: Math.min(...sectionHotspots.map((spot) => spot.xPercent)) / 100 * studyBase.width,
        right: Math.max(...sectionHotspots.map((spot) => spot.xPercent + spot.widthPercent)) / 100 * studyBase.width,
        top: Math.min(...sectionHotspots.map((spot) => spot.yPercent)) / 100 * studyBase.height,
        bottom: Math.max(...sectionHotspots.map((spot) => spot.yPercent + spot.heightPercent)) / 100 * studyBase.height,
      }
    : { left: 0, right: studyBase.width, top: 0, bottom: studyBase.height };

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

  // 模块化像素零件层（静态家具、四帧壁灯和屏幕光点等独立 PNG 零件）
  const propsLayer = document.createElement('div');
  propsLayer.className = 'study-props';
  propsLayer.setAttribute('aria-hidden', 'true');
  art.append(propsLayer);

  // 挂载每个模块化零件及其状态精灵图
  type MountedProp = {
    stateImages: Map<string, HTMLImageElement>;
  };
  const mountedProps = new Map<string, MountedProp>();
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

    propsLayer.append(propEl);
    mountedProps.set(prop.id, { stateImages });
  }

  // 轮廓用 SVG 路径，和 Aseprite 主工程共享 640×360 基准像素坐标。
  const outlineMap = document.createElementNS(svgNs, 'svg');
  outlineMap.setAttribute('class', 'study-outline-map');
  outlineMap.setAttribute('viewBox', `0 0 ${studyBase.width} ${studyBase.height}`);
  outlineMap.setAttribute('preserveAspectRatio', 'none');
  outlineMap.setAttribute('aria-hidden', 'true');
  const shapes = new Map<HotspotId, SVGPathElement>();

  for (const spot of allHotspots) {
    const path = document.createElementNS(svgNs, 'path');
    path.setAttribute('class', `hotspot-shape hotspot-shape-${spot.id}`);
    path.setAttribute('data-hotspot', spot.id);
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('d', spot.fallbackPath);
    outlineMap.append(path);
    shapes.set(spot.id, path);
  }
  art.append(outlineMap);

  // 创建主栏目热点与场景内微交互零件按钮
  for (const spot of allHotspots) {
    const wrap = document.createElement('div');
    wrap.className = `hotspot-wrap hotspot-${spot.id}${spot.labelBelow ? ' label-below' : ''}`;
    Object.assign(wrap.style, {
      left: `${spot.xPercent}%`, top: `${spot.yPercent}%`,
      width: `${spot.widthPercent}%`, height: `${spot.heightPercent}%`,
      zIndex: String(spot.priority + 3),
    });

    const isLink = spot.kind === 'section';
    const hotspot = document.createElement(isLink ? 'a' : 'button');
    hotspot.className = 'study-hotspot';
    hotspot.id = spot.id === 'door' ? 'door' : `hotspot-${spot.id}`;
    hotspot.setAttribute('aria-label', spot.label);
    hotspot.setAttribute('data-hotspot', spot.id);

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

    if (spot.prop?.action?.type === 'read-note' && spot.prop.action.text) {
      hotspot.dataset.noticeText = spot.prop.action.text;
      hotspot.setAttribute('aria-haspopup', 'dialog');
      hotspot.setAttribute('aria-controls', 'section-dialog');
    }

    wrap.append(hotspot, caption);
    art.append(wrap);
    anchors.set(spot.id, hotspot);
    wrappers.set(spot.id, wrap);
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

  const resize = () => fitStudyToScene(scene, art, studyBase, hotspotBounds);
  new ResizeObserver(resize).observe(scene);
  resize();

  // 初次进入书房时，用一次轻柔的微光扫过物件轮廓，提示房间里的物件可以点击。
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const playIntroHint = () => {
      const preferredOrder: HotspotId[] = ['news', 'research', 'profile', 'notes', 'quests', 'door'];
      const order = preferredOrder.filter((id) => shapes.has(id));
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
  // 1) 主栏目从 640×360 的 hotspots.png 解码并提取完整外轮廓；
  // 2) 独立拆出的可交互零件直接读取自身 PNG 的 Alpha ≥ 16 通道自动合成命中区与 Marching Squares 金色描边。
  const contourCache = new Map<HotspotId, Contour[]>();
  const isolatedPropMasks = new Map<HotspotId, MaskData>();
  let baseMask: MaskData | undefined;
  let hitMask: MaskData | undefined;

  function ensureContours(id: HotspotId): Contour[] {
    const cached = contourCache.get(id);
    if (cached) return cached;
    const spot = hotspotsById.get(id);
    if (!spot) return [];
    const sourceMask = spot.kind === 'prop' ? isolatedPropMasks.get(id) : baseMask;
    if (!sourceMask) return [];
    const contours = traceLabel(sourceMask, spot.key);
    contourCache.set(id, contours);
    const outline = spot.outline === 'largest' ? contours.slice(0, 1) : contours;
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
    const radius = Math.min(14, Math.max(3, Math.round(5 * studyBase.width / rect.width)));
    return labelToId.get(lookupMask(hitMask, x, y, radius));
  }

  async function stampInteractiveProps(targetHitMask: MaskData) {
    const offscreen = document.createElement('canvas');
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    for (const spot of propHotspots) {
      const { prop } = spot;
      if (!prop) continue;
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

    await stampInteractiveProps(hitMask);

    art.classList.add('has-hit-layer');

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

    let warmIndex = 0;
    const warm = () => {
      if (warmIndex >= allHotspots.length) return;
      ensureContours(allHotspots[warmIndex].id);
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
    console.warn('Hotspot mask unavailable; using bounding-box fallback.', error);
  });
}

const desktopInsets = { side: 0, top: 0, bottom: 0 };

function fitStudyToScene(
  scene: HTMLElement,
  art: HTMLElement,
  studyBase: { width: number; height: number },
  hotspotBounds: BoundsRect,
) {
  const width = scene.clientWidth;
  const height = scene.clientHeight;
  if (!width || !height) return;

  let scale = Math.min(width / studyBase.width, height / studyBase.height);
  const desktop = !window.matchMedia('(max-width: 760px)').matches;
  if (desktop) {
    const cover = Math.max(width / studyBase.width, height / studyBase.height);
    const boundsW = Math.max(1, hotspotBounds.right - hotspotBounds.left);
    const boundsH = Math.max(1, hotspotBounds.bottom - hotspotBounds.top);
    const fitHotspots = Math.min(
      (width - 2 * desktopInsets.side) / boundsW,
      (height - desktopInsets.top - desktopInsets.bottom) / boundsH,
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
