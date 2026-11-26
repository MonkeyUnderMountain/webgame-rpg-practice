# 首页书房概念与制作文件

当前首页使用 `shortlist/09s-pixel-vivid-b-96.png` 的 96 色像素版；站点实际读取的副本是 [`public/art/study/mage/study.png`](../../public/art/study/mage/study.png)（1672×941）。

六个热点的颜色、标签和降级多边形在 [`src/study-hotspots.json`](../../src/study-hotspots.json)。真正驱动命中与轮廓的是 [`public/art/study/mage/hotspots.png`](../../public/art/study/mage/hotspots.png)：一张 1672×941 的颜色索引图，用 `preview/label-tool.html` 标注和导出。旧的多边形数据（`preview/label-polygons-v5.json`）只作历史参考。

## 目录

| 路径 | 用途 |
| --- | --- |
| `shortlist/` | 概念候选与像素化版本；`09s-pixel-vivid-b-96.png` 是最终选稿 |
| `archive/` | 更早的房间方案，只作留档，不参与当前页面 |
| `preview/` | 标注与轮廓工作区，保留中间预览 |
| `2-label-map.png`、`3-label-map.png`、`label-map.png` | 早期手工标注底图与导出图；当前只作参考 |
| `preview/label-tool.html` | 全分辨率热点掩膜工作台，通过 Vite 打开 |
| `preview/label-polygons-v5.json` | 旧的多边形源数据，仅作历史参考 |
| `preview/mage-study-hotspot-preview.html` | 热点轮廓预览 |
| `preview/mage-study-light-preview.html` | 环境光效预览 |
| `../study/room-layouts/layout-reference.png` | 早期房间布局参考 |

## 调整热点

1. 用 `npm.cmd run dev` 启动，打开 Vite 地址下的 `/artwork/homepage-concepts/preview/label-tool.html`。
2. 选标签，用 **Brush / Line / Fill / Wand** 沿物体边缘收紧；**0 背景**就是橡皮，**Wand** 按底图颜色选整块（容差从 8 左右开始）。
3. 金色轮廓预览和首页一致；完成后点 **Save hotspots.png**，覆盖 `public/art/study/mage/hotspots.png`。
4. 刷新首页，用鼠标和 `Tab` 检查六个热点；访问 `?debug=hotspots` 可叠加显示掩膜和全部轮廓。

## 历史

`archive/` 里的游侠树屋、吟游诗人阁楼等方案是在当前 mage study 之前比较过的方向，保留用于追溯。当前页面只使用 `shortlist/09s-pixel-vivid-b-96.png`。
