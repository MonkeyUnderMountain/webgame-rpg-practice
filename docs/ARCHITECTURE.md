# 书房主页架构说明

## 1. 整体数据流：从 Aseprite 主工程到浏览器场景

```text
artwork/study/study-master.aseprite (960×540, 4 帧循环时间轴)
  │
  ├─ 运行 npm.cmd run art:export (scripts/export-study.mjs -> export-study.lua)
  │
  ├──► public/art/study/mage/study.png        (2× 导出：1920×1080 书房底图)
  ├──► public/art/study/mage/hotspots.png     (1× 导出：960×540 六大主栏目颜色掩膜)
  ├──► public/art/study/mage/props/*.png      (2× 导出：自动裁剪透明边的零件与多帧横向精灵表)
  └──► src/study-scene.json                   (自动计算的 960×540 坐标、帧率与交互状态机清单)
```

## 2. 点击书房物件或微交互零件时，代码如何工作？

1. **入口挂载**：
   [`index.html`](../index.html) 定义书房画布容器、页眉导航、页脚控制、阅读卷轴弹窗（`#section-dialog`）与门外风景弹窗（`#door-dialog`）。[`src/main.ts`](../src/main.ts) 启动时依次挂载 `mountStudy()`、`mountMusic()`、`mountReadingPanel()` 和门外风景弹窗。
2. **分层场景与状态机（[`src/study.ts`](../src/study.ts)）**：
   - 读取 [`src/study-scene.json`](../src/study-scene.json)，将底图（`.study-image`）、模块化零件层（`.study-props`）、环境光效层（`.study-fx`）、SVG 金色轮廓层（`.study-outline-map`，`viewBox="0 0 960 540"`）以及无障碍焦点按钮/链接放进同一个 `.study-art` 容器。
   - 静态零件渲染为按 `960×540` 百分比定位的图像；多帧零件（如 4 帧烛火或青烟）通过横向 Sprite Sheet + CSS `steps(N)` 播放整数像素帧动画。
   - **场景内微交互**：
     - `toggle-state`（三支蜡烛）：点击在 `lit`（播放 4 帧跳动火苗 + 开启对应 `.fx-candle` 暖光光晕）与 `unlit`（播放 4 帧袅袅青烟 + 熄灭局部暖光）之间切换；
     - `cycle-target`（黑板下沿粉笔槽）：点击在 3 幅像素数学图（射影几何、同调代数蛇引理、代数拓扑环面与三叶结）之间循环切换，状态持久化在 `localStorage`。
3. **自动像素级命中与 Marching Squares 描边（[`src/hotspotMask.ts`](../src/hotspotMask.ts)）**：
   - 六大主栏目（`News`、`Research`、`About`、`Notes`、`Side Quests`、`Look outside`）从 `960×540` 的 `hotspots.png` 解码基础命中表并追踪完整外轮廓。
   - 独立拆出的可交互零件无需手工涂掩膜：运行时直接读取零件 PNG 第 1 帧的 `Alpha ≥ 16` 不透明像素（`maskFromAlpha`），用 `stampMask` 覆盖到全局命中表上，并用 Marching Squares（`traceLabel`）自动生成贴合零件边缘的 SVG 金色轮廓。
   - 访问 `?debug=hotspots` 可在画面上叠加显示完整的 `960×540` 彩色命中掩膜与所有金色轮廓。
4. **阅读卷轴与路由同步（[`src/readingPanel.ts`](../src/readingPanel.ts)）**：
   - 用 Vite 的 `?raw` 导入 `content/home/` 下的五份 HTML（`profile`、`notes`、`news`、`research`、`quests`）。无论是点击书房主物件、顶部导航，还是直接访问带 `#notes` 的网址，都会同步浏览器历史记录并展开居中的羊皮卷弹窗。
5. **背景音乐控制（[`src/music.ts`](../src/music.ts)）**：
   - 控制 `<audio id="study-music">` 与页脚开关。默认关闭（`preload="none"`），点击后淡入播放，关闭时淡出暂停，切到后台标签页时立即静音暂停。
