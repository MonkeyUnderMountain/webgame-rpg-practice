import Phaser from 'phaser';

// 分类名对应 world/ 下的目录，文件名也是地图和角色使用的纹理名。
const sprites = {
  tiles: ['grass', 'path', 'water', 'stone', 'ruinWall', 'void', 'bridge'],
  scenery: ['tree', 'rock', 'shrub', 'flower', 'mushrooms', 'reeds', 'crate', 'sign'],
  objects: ['portal', 'lamp', 'rest', 'marker'],
  characters: ['heroDown', 'heroUp', 'heroLeft', 'heroRight', 'npc', 'enemy'],
};



// 先加载 PNG，再设为最近邻采样，让放大后的像素边缘保持清晰。
export function preloadArt(scene: Phaser.Scene): void {
  for (const [folder, names] of Object.entries(sprites)) {
    for (const name of names) {
      scene.load.image(name, `${import.meta.env.BASE_URL}art/world/${folder}/${name}.png`);
    }
  }
}

export function createArt(scene: Phaser.Scene): void {
  for (const name of Object.values(sprites).flat()) {
    scene.textures.get(name).setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
}
