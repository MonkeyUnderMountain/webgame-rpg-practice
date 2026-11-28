# 书房主页架构说明

## 1. 数据流：从 Tile / Aseprite 主工程到浏览器

```text
artwork/study/room/tiles/ (1× 源素材：wall-tile / plinth-stones / floor-pavers)
  │
  ├─ npm.cmd run art:repave (scripts/pave-floor.lua)
  │    └──► 生成 room-base.png (640×360) + 连续透视延展图 (side-left / side-right / floor-bottom-tile)
  │
artwork/study/room/study-master.aseprite (640×360, 4 帧循环时间轴)
  │
  ├─ npm.cmd run art:export (scripts/export-study.mjs -> export-study.lua)
  │
  ├──► public/art/study/study.png        (3× 导出：1920×1080 书房底图)
  ├──► public/art/study/hotspots.png     (1× 导出：640×360 六栏目颜色掩膜)
  ├──► public/art/study/props/*.png      (3× 导出：自动裁剪透明边的静态与多帧精灵图)
  ├──► public/art/study/tiles/*.png      (3× 导出：四周无缝扩屏延展图)
  ├──► public/art/study/ui/*.png         (3× 导出：九宫格像素弹窗框、关闭按钮与悬浮标签框)
  └──► src/study-scene.json              (自动计算的 640×360 坐标、延展图尺寸、帧率与交互清单)
```

`study.png` 只包含 `00_room_base`（石砖墙、凿石踢脚条石与透视石砖地面）。窗景、窗框、门、黑板、桌椅、书柜、灯光与便签都是独立 PNG 零件，按场景清单的百分比坐标叠在底图上。

---

## 2. 页面入口与运行时

1. [`index.html`](../index.html) 定义书房画布（`#study-view` / `#study-scene` / `#study-art`）、顶部导航、右下角页脚、阅读弹窗（`#section-dialog`）与门外风景弹窗（`#door-dialog`）。
2. [`src/main.ts`](../src/main.ts) 加载本地打包的像素字体（`Pixelify Sans` 500/600/700 负责标题与导航，`VT323` 负责正文与小号文字），并依次挂载：
   - `mountStudy()`：底图、四周延展带、模块化零件、SVG 描边和热点；
   - `mountMusic()`：背景音乐开关；
   - `mountReadingPanel()`：五个学术栏目和三张便签；
   - `mountDoorDialog()`：门外风景弹窗。
3. [`src/study.ts`](../src/study.ts) 读取 [`src/study-scene.json`](../src/study-scene.json)：
   - 核心画布按 640×360 逻辑坐标缩放，所有零件用百分比绝对定位；
   - 多帧零件使用横向 Sprite Sheet + CSS `steps(N)` 播放整数像素帧动画；
   - 六栏目和三张便签共享同一个 SVG 青蓝轮廓层，悬停标签统一显示在物件正上方；
   - 每次窗口尺寸变化时，将场景当前逻辑像素倍率按物理像素对齐并写入 CSS 变量 `--px`（`Math.round(scale * dpr) / dpr`，限制在 `2px–4px`），让所有 UI 像素边框与书房像素颗粒保持一致。

---

## 3. 多屏幕比例适配与四周延展带（方案 A + 策略 1）

核心书房固定为 **640×360**，所有家具、光影、热点和 Aseprite 图层坐标都不随屏幕比例变动。为了在不同比例屏幕下既不裁切家具、又不留黑边，[`src/study.ts`](../src/study.ts) 采用 **四周 4 延展带** 机制：

1. **核心画布缩放（策略 1）**  
   `fitStudyToScene()` 按 `scale = Math.min(width / 640, height / 360)` 计算 `#study-art` 的尺寸与居中偏移 `(left, top)`：
   - **16:9 屏**：核心书房刚好铺满全屏，延展带自动隐藏；
   - **更宽屏（如 21:9）**：核心画布垂直撑满，左右空白由 `.study-ext-left` / `.study-ext-right` 填满；
   - **更方或竖长桌面屏（如 16:10 / 4:3 / 竖屏平板）**：核心画布水平撑满，上下空白由 `.study-ext-top` / `.study-ext-bottom` 填满；
   - **手机竖屏（`<= 760px`）**：改为上下文档流（顶栏 → 完整 16:9 书房 → 底栏）。
2. **4 个延展带如何做到 1 像素对齐且绝不漏缝**  
   所有 `.study-ext` 位于 `z-index: 0`，位于 `#study-art`（`z-index: 1`）下方，并向核心画布底部多叠 **1px**（覆盖浏览器子像素舍入可能产生的细缝）：
   - **上延展带（`wall-tile.png`）**：`background-repeat: repeat`，定位在 `${left}px ${top}px`，使砖缝在 `y = top` 处与核心画布顶边对齐并向上/向两侧无限平铺。
   - **左延展带（`side-left.png`，`320×360`）**：`background-repeat: no-repeat`，宽度 `left + 1`，定位在 `${left - tileW}px 0px`，将其右边缘紧贴核心画布 `x = 0`，连续承接向左发散的地面透视（支持至 32:9 超宽屏）。
   - **右延展带（`side-right.png`，`320×360`）**：`background-repeat: no-repeat`，起点 `left + artWidth - 1`，定位在 `1px 0px`，将其左边缘紧贴核心画布 `x = 640`，连续承接向右发散的地面透视。
   - **下延展带（`floor-bottom-tile.png`，`640×420`）**：`background-repeat: repeat-x`（禁用纵向重复防止回卷错位），起点 `top + artHeight - 1`，定位在 `${left}px 1px`，向下连续延展前景透视地板并通过 `.study-ext-bottom::after` 柔和压暗至前景阴影。

---

## 4. 一点透视地面铺设与墙地衔接

房间内采用室内连贯地面（无悬空平台台阶、无墙脚青苔），全部家具与光影在 [`scripts/init-study-master.lua`](../scripts/init-study-master.lua) 中通过 `SHIFT_Y = 24` 统一下移，为上方顶栏和拱窗顶留出充足砖墙呼吸空间：

- **垂直分层（`640×360`）**：
  - `y = 0..291`：石砖墙（由 `wall-tile.png` 无缝铺成，贴近踢脚上方 4px 微压暗）；
  - `y = 292..301`：10px 规整凿石踢脚条石（`plinth-stones.png`），以 1px 受光上倒角和底部接触阴影隔开垂直冷石墙与水平暖灰地；
  - `y = 302..359`：统一世界尺度的一点透视错缝石砖地面。
- **一点透视投影算法（[`scripts/pave-floor.lua`](../scripts/pave-floor.lua)）**：
  - 取房间中轴灭点 `(VX = 320, VY = 60)`、墙脚线 `Y_WALL = 302`，每个像素 `(wx, wy)` 按真实射影映射回世界坐标：
    - 深度 `Z(wy) = FZ / (wy - VY)`，行号 `rowF = (Z_AT_WALL - Z) / ROW_PITCH_Z`；
    - 水平坐标 `xWorld = ((wx - VX) / (wy - VY)) * FX + stagger`（奇数行错缝 `0.5`）。
  - **严格 1 像素砖缝**：用**离散行/列索引跳变**（`rowIdx(wy) ~= rowIdx(wy - 1)` 与 `colIdx(wx, wy) ~= colIdx(wx - 1, wy)`）判定水平与斜向砖缝，避免浮点距离阈值带来的双倍粗黑线或断线。
  - **平铺水平面明暗**：从 `floor-pavers.png`（8 块 `32×32` 世界 UV 石纹）采样，叠加按砖块哈希的微色差（`-1/0/+1`）、墙脚 18px 柔和环境光遮蔽（AO）以及砖缝边缘 1px 细微受光边，确保表面读作平坦的水平石板地面而非垂直砖墙。
  - **连续透视延展**：用完全相同的相机函数一次渲染核心 `room-base.png`（`x=0..639, y=0..359`）、`side-left.png`（`x=-320..-1`）、`side-right.png`（`x=640..959`）和 `floor-bottom-tile.png`（`y=360..779`），保证四边透视线连续不断。

---

## 5. 六个栏目热点与便签

`99_hotspot_mask` 是默认隐藏的 640×360 颜色掩膜层，初始化脚本按物件 Alpha 自动填色（同步应用 `SHIFT_Y = 24`）：

| 栏目 | 物件 | 掩膜来源 |
| --- | --- | --- |
| News | 软木公告板 | `noticeboard.png` |
| Research | 黑板 | `chalkboard-frame.png` |
| About | 书桌 + 椅子 | `desk.png` + `desk-chair.png` |
| Notes | 书柜 | `bookcase/frame.png` |
| Side quests | 桌边纸箱 | `supply-box.png` |
| Look outside | 木门 | `door.png` |

颜色必须与 [`scripts/export-study.lua`](../scripts/export-study.lua) 的 `SECTION_SPECS` 一致。运行时用 `decodeMask()` 建立命中表，再用 Marching Squares 追踪外轮廓。三张便签则读取自身 PNG 的 `Alpha ≥ 16` 生成命中区和轮廓，叠在公告板之上（点便签读短文，点板面打开 News）。

---

## 6. 像素弹窗 UI、路由与分栏目皮肤扩展口

1. **三层极简弹窗结构**：`dialog.panel[data-panel="..."] > .panel-box > (button.panel-close + div.panel-body)`。
   - `.panel-box` 使用 3× 导出的九宫格像素框 [`panel-frame.png`](../public/art/study/ui/panel-frame.png)（`32×32` 逻辑像素，四角切片 `12` → `border-image-slice: 36 fill`），边宽按 `calc(12 * var(--px))` 与书房像素同步缩放；
   - `.panel-close` 使用 `11×11` 双态精灵图 [`panel-close.png`](../public/art/study/ui/panel-close.png)，悬停切换亮青蓝态，按下下移 `1 * var(--px)`；
   - `.panel-body` 带有 `tabindex="-1" autofocus` 且隐藏聚焦外框，确保 `<dialog>.showModal()` 打开时默认聚焦正文容器（可直接方向键滚动、`Esc` 关闭），避免右上角 `×` 按钮首次打开被抢焦点并出现外框。
2. **分栏目独立皮肤扩展口**：[`src/readingPanel.ts`](../src/readingPanel.ts) 打开栏目或便签时会自动设置 `dialog.dataset.panel`（`profile` / `notes` / `news` / `research` / `quests` / `notice`），门外弹窗固定为 `data-panel="door"`。后续为任意栏目设计独立视觉时，只需在 [`src/style.css`](../src/style.css) 用 `.panel[data-panel="..."]` 覆写 `--panel-frame` 等变量即可。
3. **路由与音乐**：点击物件、顶部导航或直接访问 `#notes` 等锚点均与浏览器历史同步；关闭时清锚点并移开场景焦点。[`src/music.ts`](../src/music.ts) 控制默认关闭的背景音乐，淡入淡出并在切后台标签页时自动暂停。

---

## 7. 调试与构建

- `?debug=hotspots`：在画面上叠加 640×360 彩色命中掩膜与全部轮廓。
- `npm.cmd run build`：`tsc --noEmit` 类型检查后由 Vite 生成 `dist/`。
- `npm.cmd run art:export`：从 `study-master.aseprite` 导出底图、零件、掩膜，并按 3× 同步导出 `tiles/` 与 `ui/`。
- `npm.cmd run art:init`：从 `room-base.png` 与 `props/` 重建母版并导出；`npm.cmd run art:repave` 会先调用 `scripts/pave-floor.lua` 从 `tiles/` 重铺底图与四周透视延展图。
