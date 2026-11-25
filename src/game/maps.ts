// 地图网格和坐标。格坐标按列、行排列，pixel() 返回该格的像素中心。
export type Area = 'waystation' | 'ruin';
export type Tile = 'grass' | 'path' | 'water' | 'stone' | 'ruinWall' | 'void' | 'bridge';
export type Position = [col: number, row: number];
export type Placement = [texture: string, col: number, row: number, size?: number];

export const TILE = 24;
export const COLS = 32;
export const ROWS = 17;
export const WIDTH = COLS * TILE;
export const HEIGHT = ROWS * TILE;
export const WALKABLE = new Set<Tile>(['grass', 'path', 'stone', 'bridge']);

export function pixel(tile: number): number {
  return (tile + 0.5) * TILE;
}

export function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}



// 驿站的门占一格，落脚点放在门旁，可以走开或原路返回。
export const HOME_DOOR: Position = [4, 13];
export const WAYSTATION_ENTRY: Position = [5, 13];
export const ARCH_DOOR: Position = [26, 5];
export const WAYSTATION_FROM_RUIN: Position = [26, 6];
export const WAYFARER: Position = [10, 10];
export const WAYSTATION_REST: Position = [11, 12];



// 遗迹里的入口、休息点和机关。交互、碰撞和绘制都使用同一组格坐标。
export const RUIN_EXIT: Position = [3, 12];
export const RUIN_ENTRY: Position = [4, 12];
export const RUIN_REST: Position = [5, 13];
export const GATE_WINCH: Position = [6, 4];
export const SENTINEL: Position = [15, 3];
export const LAMP: Position = [25, 7];
export const WEST_MARK: Position = [12, 10];
export const EAST_MARK: Position = [17, 10];
export const BRIDGE_ROW = 10;
export const BRIDGE_START = 13;
export const BRIDGE_END = 16;



// 布景按地图分组。最后一个数是相对原图的缩放比例。
export const LANDING_DECOR: Placement[] = [
  ['tree', 3, 4, 1.34], ['tree', 5, 3, 1.1], ['tree', 7, 5, 1.46], ['tree', 3, 8, 1.1],
  ['tree', 10, 6, 1.2], ['tree', 12, 4], ['tree', 15, 5, 1.25], ['rock', 19, 5],
  ['tree', 18, 3], ['tree', 28, 8, 1.3], ['tree', 29, 12, 1.25], ['tree', 24, 12],
  ['tree', 21, 14, 1.3], ['tree', 26, 15, 1.35], ['tree', 9, 14, 1.3], ['tree', 3, 15],
  ['shrub', 6, 10], ['shrub', 15, 13], ['shrub', 21, 9], ['rock', 17, 10],
  ['flower', 8, 11], ['flower', 10, 13], ['flower', 13, 9], ['flower', 19, 10],
  ['mushrooms', 7, 6], ['mushrooms', 24, 13], ['reeds', 14, 11], ['reeds', 15, 11],
  ['reeds', 18, 12], ['crate', 12, 12], ['sign', 23, 7],
];

export const RUIN_DECOR: Placement[] = [
  ['rock', 4, 10], ['rock', 9, 13], ['rock', 10, 5], ['rock', 21, 5], ['rock', 26, 12],
  ['shrub', 8, 14], ['mushrooms', 11, 12], ['reeds', 10, 14], ['mushrooms', 6, 5],
  ['shrub', 26, 8], ['mushrooms', 20, 11], ['crate', 28, 10], ['sign', 5, 7],
];



// 按区域铺地。矩形含四条边，后铺的地块覆盖先铺的地块。
export function layout(area: Area, bridgeRevealed: boolean, sideGateOpen: boolean): Tile[][] {
  const fill: Tile = area === 'waystation' ? 'grass' : 'ruinWall';
  const rows: Tile[][] = Array.from({ length: ROWS }, () => Array<Tile>(COLS).fill(fill));

  const rect = (left: number, top: number, right: number, bottom: number, tile: Tile) => {
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) rows[row][col] = tile;
    }
  };

  if (area === 'waystation') {
    rect(0, 0, 31, 1, 'void');
    rect(0, 15, 31, 16, 'water');
    rect(0, 0, 1, 16, 'void');
    rect(30, 0, 31, 16, 'void');
    rect(12, 14, 19, 15, 'water');
    rect(13, 12, 18, 14, 'water');
    rect(15, 11, 17, 12, 'water');
    rect(4, 12, 12, 13, 'path');
    rect(9, 9, 15, 12, 'path');
    rect(13, 8, 20, 9, 'path');
    rect(19, 7, 24, 8, 'path');
    rect(22, 6, 27, 7, 'path');
    rect(22, 2, 29, 5, 'ruinWall');
    rect(24, 5, 27, 6, 'stone');
    rect(26, 4, 26, 4, 'stone');
  } else {
    rect(0, 0, 31, 0, 'void');
    rect(0, 16, 31, 16, 'void');
    rect(0, 0, 0, 16, 'void');
    rect(31, 0, 31, 16, 'void');
    rect(13, 1, 16, 15, 'void');
    rect(3, 9, 12, 14, 'stone');
    rect(6, 6, 8, 11, 'stone');
    rect(6, 4, 12, 7, 'stone');
    rect(10, 2, 14, 5, 'stone');
    rect(15, 3, 17, 3, 'stone');
    rect(18, 2, 20, 4, 'stone');
    rect(20, 3, 25, 8, 'stone');
    rect(18, 8, 28, 13, 'stone');
    rect(17, 9, 19, 11, 'stone');
    if (sideGateOpen) rect(13, 1, 20, 1, 'stone');
    if (bridgeRevealed) rect(BRIDGE_START, BRIDGE_ROW, BRIDGE_END, BRIDGE_ROW, 'bridge');
  }

  return rows;
}
