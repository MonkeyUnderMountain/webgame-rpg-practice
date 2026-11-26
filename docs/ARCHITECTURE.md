# 书房主页架构说明

## 点击书架时，哪段代码展开 Notes 卷轴？

1. [网页入口](../index.html) 定义书房底图容器、页眉导航、页脚控制、阅读卷轴弹窗（`#section-dialog`）与门外风景弹窗（`#door-dialog`）。[页面入口](../src/main.ts) 启动时挂载 `mountStudy()`、`mountMusic()`、`mountReadingPanel()` 和门外风景弹窗。
2. [书房模块](../src/study.ts) 采用 **`960×540` 基准像素网格（导出 `2×` 为 `1920×1080`）** 的分层场景架构。主工程源文件是 [`artwork/study/study-master.aseprite`](../artwork/study/study-master.aseprite)，运行 `npm.cmd run art:export`（[`scripts/export-study.mjs`](../scripts/export-study.mjs)）会调用本机 Aseprite CLI 自动裁剪导出底图 [`study.png`](../public/art/study/mage/study.png)（1920×1080）、各独立零件与帧动画精灵表（[`public/art/study/mage/props/`](../public/art/study/mage/props/)），并自动生成包含精确 `(x, y, width, height)` 与状态机配置的 [`src/study-scene.json`](../src/study-scene.json)。
   - **六大主栏目热点**的初始掩膜是 [`hotspots.png`](../public/art/study/mage/hotspots.png)（960×540，颜色索引 1–6 对应 [`study-hotspots.json`](../src/study-hotspots.json)）。
   - **独立可交互零件（微交互与新拆家具）**无需手工涂掩膜：模块在加载时直接读取零件 PNG 自身的 `Alpha ≥ 16` 像素（`maskFromAlpha` + `stampMask`）自动合成到 `960×540` 命中表，并用 Marching Squares 自动追踪出 SVG 金色轮廓。
   - **场景内状态微交互**：点击石柱、书桌或窗下长凳的三支蜡烛可在 `点亮（播放 4 帧跳动火苗 + 开启 .fx-candle 暖光光晕）` 与 `熄灭（播放 4 帧袅袅青烟 + 关闭局部暖光）` 之间切换；点击黑板下沿的粉笔槽与板擦可在 3 套手绘数学粉笔图（射影几何、同调代数蛇引理、代数拓扑环面与三叶结）之间循环切换，且状态自动保存在 `localStorage`。访问 `?debug=hotspots` 可叠加显示全部掩膜和轮廓。
3. 书架热点和顶部的 **Notes** 都是指向 `#notes` 的链接。[阅读面板模块](../src/readingPanel.ts) 用 Vite 的 `?raw` 导入 `content/home/` 下的五份 HTML（`profile`、`notes`、`news`、`research`、`quests`），并按栏目 ID 注入居中的羊皮卷轴弹窗。无论点击书房物件、顶部导航，还是直接访问带 `#notes` 的网址，都会同步浏览器历史记录并打开同一份[笔记](../content/home/notes.html)。原站 PDF 在新标签页打开。
4. 桌面和手机的书房自适应、环境光效、卷轴红木卷杆、羊皮纸面和火漆关闭按钮样式都在 [style.css](../src/style.css)。

## 点击房门时，会发生什么？

- 书房右侧房门热点和页脚的 **Look outside** 按钮都带有 `data-open-door` 属性。
- [页面入口](../src/main.ts) 的 `mountDoorDialog()` 监听点击，打开居中的 `#door-dialog` 卷轴弹窗，展示[门外风景占位图](../public/art/study/mage/beyond.svg)与说明文字。
- 按 **Esc**、点击遮罩或右上角火漆关闭按钮即可关闭弹窗，并把焦点还给触发按钮。

## 背景音乐怎样控制？

- [音乐模块](../src/music.ts) 控制 `<audio id="study-music">` 与页脚开关。默认关闭（`preload="none"`），点击后淡入到目标音量，关闭时淡出暂停，切到后台标签页时立即静音暂停。
