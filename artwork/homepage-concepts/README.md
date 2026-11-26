# 首页书房概念与制作文件

当前首页使用 `shortlist/09s-pixel-vivid-b-96.png` 的 96 色像素版；站点实际读取的副本是 [`public/art/study/mage/study.png`](../../public/art/study/mage/study.png)（1672×941）。

六个热点的线上数据在 [`src/study-hotspots.json`](../../src/study-hotspots.json)，按 557×313 逻辑坐标记录。它和 `preview/label-polygons-v5.json` 内容相同。

## 目录

| 路径 | 用途 |
| --- | --- |
| `shortlist/` | 概念候选与像素化版本；`09s-pixel-vivid-b-96.png` 是最终选稿 |
| `archive/` | 更早的房间方案，只作留档，不参与当前页面 |
| `preview/` | 标注与轮廓工作区，保留中间预览 |
| `2-label-map.png`、`3-label-map.png`、`label-map.png` | 手工标注底图与导出图；当前轮廓基于 `3-label-map.png` |
| `preview/label-polygons-v5.json` | 当前六热点多边形源数据 |
| `preview/label-tool.html` | 手工标注工具，通过 Vite 打开 |
| `preview/mage-study-hotspot-preview.html` | 热点轮廓预览 |
| `preview/mage-study-light-preview.html` | 环境光效预览 |
| `../study/room-layouts/layout-reference.png` | 早期房间布局参考 |

## 调整热点

1. 用 `npm.cmd run dev` 启动，打开 Vite 地址下的 `/artwork/homepage-concepts/preview/label-tool.html`。
2. 用 **Line / Brush / Fill** 修边界，导出 `label-map.png`。
3. 按 557×313 逻辑坐标更新 `preview/label-polygons-v5.json`，再同步到 `src/study-hotspots.json`。
4. 刷新首页，用鼠标和 `Tab` 检查六个热点的轮廓、标签和点击区域。

## 历史

`archive/` 里的游侠树屋、吟游诗人阁楼等方案是在当前 mage study 之前比较过的方向，保留用于追溯。当前页面只使用 `shortlist/09s-pixel-vivid-b-96.png`。
