import { cellKey, TILE, WALKABLE, type Tile } from './maps';

type PixelPosition = { x: number; y: number };

const WALK_SPEED = 112;



// 碰撞框的四个角都要落在可走地面上，并避开物件占用的格子。
export function canStand(tiles: Tile[][], solid: ReadonlySet<string>, x: number, y: number): boolean {
  for (const [dx, dy] of [[-6, -5], [6, -5], [-6, 5], [6, 5]]) {
    const col = Math.floor((x + dx) / TILE);
    const row = Math.floor((y + dy) / TILE);
    if (!WALKABLE.has(tiles[row]?.[col]) || solid.has(cellKey(col, row))) return false;
  }
  return true;
}



// 斜向移动与直线移动等速。分开检查两轴，小人才能沿墙滑动。
export function movePosition(
  tiles: Tile[][], solid: ReadonlySet<string>, position: PixelPosition,
  dx: number, dy: number, dt: number,
): PixelPosition {
  const { x, y } = position;
  const speed = WALK_SPEED * (dt / 1000) / Math.hypot(dx, dy);
  const nextX = x + dx * speed;
  const nextY = y + dy * speed;
  const steppedX = canStand(tiles, solid, nextX, y) ? nextX : x;
  const steppedY = canStand(tiles, solid, steppedX, nextY) ? nextY : y;
  return { x: steppedX, y: steppedY };
}
