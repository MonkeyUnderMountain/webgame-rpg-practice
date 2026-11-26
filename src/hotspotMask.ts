// 热点掩膜：颜色索引 PNG 的解码、命中查表和像素轮廓追踪。
// 掩膜与书房底图共享同一套像素坐标，颜色 1–6 对应 study-hotspots.json 的 key。
export type Rgb = [number, number, number];
export type MaskBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type MaskData = {
  width: number;
  height: number;
  labels: Uint8Array;
  bounds: Array<MaskBounds | undefined>;
};
export type Contour = { points: number[]; area: number };



const colorKey = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

function boundsOfLabels(
  labels: Uint8Array,
  width: number,
  height: number,
  count: number,
): Array<MaskBounds | undefined> {
  const bounds: Array<MaskBounds | undefined> = Array.from({ length: count }, () => undefined);
  for (let i = 0; i < labels.length; i += 1) {
    const label = labels[i];
    if (!label) continue;
    const x = i % width;
    const y = (i - x) / width;
    const bound = bounds[label];
    if (!bound) {
      bounds[label] = { minX: x, minY: y, maxX: x, maxY: y };
    } else {
      if (x < bound.minX) bound.minX = x;
      if (x > bound.maxX) bound.maxX = x;
      if (y < bound.minY) bound.minY = y;
      if (y > bound.maxY) bound.maxY = y;
    }
  }
  return bounds;
}

export function decodeMask(image: ImageData, colors: Rgb[]): MaskData {
  const { width, height, data } = image;
  const labels = new Uint8Array(width * height);
  const colorMap = new Map<number, number>();
  colors.forEach(([r, g, b], index) => colorMap.set(colorKey(r, g, b), index));
  for (let i = 0, p = 0; i < labels.length; i += 1, p += 4) {
    labels[i] = colorMap.get(colorKey(data[p], data[p + 1], data[p + 2])) ?? 0;
  }
  return { width, height, labels, bounds: boundsOfLabels(labels, width, height, colors.length) };
}

export function maskFromLabels(labels: Uint8Array, width: number, height: number, count = 7): MaskData {
  return { width, height, labels, bounds: boundsOfLabels(labels, width, height, count) };
}

// 从单个零件 PNG 的 Alpha 通道直接生成该零件在场景基准网格下的掩膜与包围盒。
export function maskFromAlpha(
  propImage: ImageData,
  sceneWidth: number,
  sceneHeight: number,
  offsetX: number,
  offsetY: number,
  label: number,
  alphaThreshold = 16,
): MaskData {
  const labels = new Uint8Array(sceneWidth * sceneHeight);
  const { width: pw, height: ph, data } = propImage;
  let minX = sceneWidth;
  let minY = sceneHeight;
  let maxX = -1;
  let maxY = -1;

  for (let py = 0; py < ph; py += 1) {
    const sy = offsetY + py;
    if (sy < 0 || sy >= sceneHeight) continue;
    for (let px = 0; px < pw; px += 1) {
      const sx = offsetX + px;
      if (sx < 0 || sx >= sceneWidth) continue;
      const alpha = data[(py * pw + px) * 4 + 3];
      if (alpha >= alphaThreshold) {
        labels[sy * sceneWidth + sx] = label;
        if (sx < minX) minX = sx;
        if (sx > maxX) maxX = sx;
        if (sy < minY) minY = sy;
        if (sy > maxY) maxY = sy;
      }
    }
  }

  const bounds: Array<MaskBounds | undefined> = Array.from({ length: label + 1 }, () => undefined);
  if (maxX >= minX && maxY >= minY) {
    bounds[label] = { minX, minY, maxX, maxY };
  }
  return { width: sceneWidth, height: sceneHeight, labels, bounds };
}

// 将高优先级零件的 Alpha 掩膜覆盖到全局命中掩膜上。
export function stampMask(target: MaskData, source: MaskData, label: number): void {
  const bound = source.bounds[label];
  if (!bound) return;
  const { width, labels: dst } = target;
  const src = source.labels;
  for (let y = bound.minY; y <= bound.maxY; y += 1) {
    let idx = y * width + bound.minX;
    for (let x = bound.minX; x <= bound.maxX; x += 1, idx += 1) {
      if (src[idx] === label) dst[idx] = label;
    }
  }
  target.bounds[label] = { ...bound };
}

// 先查像素本身；未命中时按 Chebyshev 距离向外找最近的已标注像素，给点击留一点容差。
export function lookupMask(mask: MaskData, x: number, y: number, radius = 0): number {
  const { width, height, labels } = mask;
  const inside = (px: number, py: number) => px >= 0 && py >= 0 && px < width && py < height;
  if (inside(x, y)) {
    const label = labels[y * width + x];
    if (label) return label;
  }
  for (let distance = 1; distance <= radius; distance += 1) {
    const top = y - distance;
    const bottom = y + distance;
    for (let dx = -distance; dx <= distance; dx += 1) {
      const left = x + dx;
      if (inside(left, top)) {
        const label = labels[top * width + left];
        if (label) return label;
      }
      if (inside(left, bottom)) {
        const label = labels[bottom * width + left];
        if (label) return label;
      }
    }
    for (let dy = -distance + 1; dy <= distance - 1; dy += 1) {
      const left = x - distance;
      const right = x + distance;
      if (inside(left, y + dy)) {
        const label = labels[(y + dy) * width + left];
        if (label) return label;
      }
      if (inside(right, y + dy)) {
        const label = labels[(y + dy) * width + right];
        if (label) return label;
      }
    }
  }
  return 0;
}



// Marching squares：每个格子看四个角，沿格子边中点连出闭合轮廓。
// 端点类型：0 上，1 右，2 下，3 左。
const CASES: Array<Array<[number, number]>> = [];
CASES[1] = [[3, 0]];
CASES[2] = [[0, 1]];
CASES[3] = [[3, 1]];
CASES[4] = [[1, 2]];
CASES[5] = [[3, 0], [1, 2]];
CASES[6] = [[0, 2]];
CASES[7] = [[3, 2]];
CASES[8] = [[2, 3]];
CASES[9] = [[0, 2]];
CASES[10] = [[0, 1], [2, 3]];
CASES[11] = [[1, 2]];
CASES[12] = [[1, 3]];
CASES[13] = [[0, 1]];
CASES[14] = [[0, 3]];

function simplify(points: number[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    while (out.length >= 4) {
      const x1 = out[out.length - 4];
      const y1 = out[out.length - 3];
      const x2 = out[out.length - 2];
      const y2 = out[out.length - 1];
      const cross = (x2 - x1) * (y - y2) - (y2 - y1) * (x - x2);
      if (cross !== 0) break;
      const dot = (x2 - x1) * (x - x2) + (y2 - y1) * (y - y2);
      if (dot < 0) break;
      out.length -= 2;
    }
    out.push(x, y);
  }
  return out;
}

function areaOf(points: number[]): number {
  let sum = 0;
  const count = points.length / 2;
  for (let i = 0; i < count; i += 1) {
    const j = (i + 1) % count;
    sum += points[i * 2] * points[j * 2 + 1] - points[j * 2] * points[i * 2 + 1];
  }
  return Math.abs(sum) / 2;
}

export function traceLabel(mask: MaskData, label: number): Contour[] {
  const bound = mask.bounds[label];
  if (!bound) return [];
  const { width, height, labels } = mask;
  const padWidth = width + 2;
  const pad = new Uint8Array(padWidth * (height + 2));
  for (let y = bound.minY; y <= bound.maxY; y += 1) {
    let source = y * width + bound.minX;
    let target = (y + 1) * padWidth + bound.minX + 1;
    for (let x = bound.minX; x <= bound.maxX; x += 1, source += 1, target += 1) {
      if (labels[source] === label) pad[target] = 1;
    }
  }
  const inside = (x: number, y: number) => pad[(y + 1) * padWidth + (x + 1)] === 1;
  const cellLeft = Math.max(-1, bound.minX - 1);
  const cellRight = Math.min(width - 1, bound.maxX);
  const cellTop = Math.max(-1, bound.minY - 1);
  const cellBottom = Math.min(height - 1, bound.maxY);

  const stride = 2 * height + 8;
  const endpoint = (type: number, x: number, y: number): number => {
    let keyX = 2 * x;
    let keyY = 2 * y;
    if (type === 0) keyX += 1;
    else if (type === 1) { keyX += 2; keyY += 1; }
    else if (type === 2) { keyX += 1; keyY += 2; }
    else keyY += 1;
    return (keyX + 2) * stride + keyY + 2;
  };

  const segments: Array<[number, number]> = [];
  const byEndpoint = new Map<number, number[]>();
  const addSegment = (a: number, b: number) => {
    const index = segments.length;
    segments.push([a, b]);
    for (const key of [a, b]) {
      const list = byEndpoint.get(key);
      if (list) list.push(index);
      else byEndpoint.set(key, [index]);
    }
  };

  for (let y = cellTop; y <= cellBottom; y += 1) {
    for (let x = cellLeft; x <= cellRight; x += 1) {
      let cellCase = 0;
      if (inside(x, y)) cellCase |= 1;
      if (inside(x + 1, y)) cellCase |= 2;
      if (inside(x + 1, y + 1)) cellCase |= 4;
      if (inside(x, y + 1)) cellCase |= 8;
      const paths = CASES[cellCase];
      if (!paths) continue;
      for (const [from, to] of paths) {
        addSegment(endpoint(from, x, y), endpoint(to, x, y));
      }
    }
  }

  const used = new Uint8Array(segments.length);
  const contours: Contour[] = [];
  for (let start = 0; start < segments.length; start += 1) {
    if (used[start]) continue;
    used[start] = 1;
    const firstKey = segments[start][0];
    let currentKey = segments[start][1];
    const keys = [firstKey, currentKey];
    let guard = 0;
    while (currentKey !== firstKey && guard <= segments.length) {
      const candidates = byEndpoint.get(currentKey);
      if (!candidates) break;
      let next = -1;
      for (const index of candidates) {
        if (!used[index]) { next = index; break; }
      }
      if (next < 0) break;
      used[next] = 1;
      const [a, b] = segments[next];
      currentKey = a === currentKey ? b : a;
      keys.push(currentKey);
      guard += 1;
    }
    if (keys.length < 4) continue;
    if (keys[keys.length - 1] === firstKey) keys.pop();
    const points: number[] = [];
    for (const key of keys) {
      const keyY = (key % stride) - 2;
      const keyX = Math.floor(key / stride) - 2;
      points.push(keyX / 2, keyY / 2);
    }
    const simplified = simplify(points);
    if (simplified.length >= 6) contours.push({ points: simplified, area: areaOf(simplified) });
  }
  contours.sort((a, b) => b.area - a.area);
  return contours;
}

function numberText(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function contoursToPath(contours: Contour[]): string {
  return contours
    .map(({ points }) => {
      let path = '';
      for (let i = 0; i < points.length; i += 2) {
        path += `${i ? ' L ' : 'M '}${numberText(points[i])} ${numberText(points[i + 1])}`;
      }
      return `${path} Z`;
    })
    .join(' ');
}
