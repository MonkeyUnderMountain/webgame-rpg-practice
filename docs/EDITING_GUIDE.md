# 修改指南

先启动[本地开发服务器](../README.md#run-locally)（`npm.cmd run dev`），打开 Vite 打印的本地地址。首页 `/` 就是 640×360 核心书房（非 16:9 屏幕四周自动无缝延展）。

---

## 1. 用 Aseprite 修改像素零件、帧动画与热点掩膜

唯一主工程是 [`artwork/study/room/study-master.aseprite`](../artwork/study/room/study-master.aseprite)（`640×360`，`3×` 导出，4 帧循环，每帧 `180ms`）。它由底图、原生尺寸零件和参考图重建（全部家具在 [`scripts/init-study-master.lua`](../scripts/init-study-master.lua) 中统一应用 `SHIFT_Y = 24` 下移，使墙脚落在 `y = 302`）；缩放后的参考图保存在隐藏层 `_ref_reference`。

### 图层结构

| 图层 / 图层组 | 作用 |
| --- | --- |
| `00_room_base` | 石砖墙（`y=0..291`）、凿石踢脚条石（`y=292..301`）与一点透视石砖地面（`y=302..359`） |
| `05_floor_light` | 地面冷影、壁灯暖光、窗光，均在家具下方 |
| `10_beyond/prop_window_view` | 窗外晴空、雪山与绿谷河流 |
| `20_furniture` | 窗框、门、黑板框、壁灯、桌、电脑、书、椅子、书柜、公告板、纸箱 |
| `30_chalkboard/prop_chalkboard_d1` | 黑板上的 Thales 定理粉笔图 |
| `35_notice_papers` | 三张可读便签；图层名是标题，User Data 是正文 |
| `40_lights_and_screens` | 四帧壁灯火苗和四帧屏幕光点 |
| `99_hotspot_mask` | 默认隐藏的六栏目颜色掩膜 |

### 六个栏目热点

`99_hotspot_mask` 里的颜色和物件一一对应：

| 栏目 | 颜色 | 掩膜来源 |
| --- | --- | --- |
| News | `58, 215, 255` | 公告板 |
| Research | `89, 226, 138` | 黑板框 |
| About | `255, 210, 122` | 书桌 + 椅子 |
| Notes | `255, 154, 120` | 书柜框 |
| Side quests | `214, 140, 255` | 纸箱 |
| Look outside | `255, 122, 168` | 木门 |

颜色必须与 [`scripts/export-study.lua`](../scripts/export-study.lua) 的 `SECTION_SPECS` 完全一致。初始化脚本会按物件 Alpha 自动生成掩膜；如果你在 Aseprite 里移动了物件，也要同步移动 `99_hotspot_mask` 里对应的色块，或在 [`scripts/init-study-master.lua`](../scripts/init-study-master.lua) 的 `sectionMasks` 表里更新坐标。

三张便签不涂在掩膜层：它们是独立图层，导出后由前端读取 PNG 的 Alpha 生成命中区和轮廓，并盖在公告板之上。所有悬停标签统一显示在物件正上方。

### 修改或新增零件

1. 用 Aseprite 打开 `artwork/study/room/study-master.aseprite`。
   - 按 **`Enter`** 预览 4 帧动画；用眼睛图标切换隐藏层。
   - 新增独立零件时，新建以 `prop_` 开头的图层，在 640×360 画布对应位置绘制；导出脚本会自动发现并写入场景清单。
2. 保存 `.aseprite` 后运行：
   ```powershell
   npm.cmd run art:export
   ```
   导出脚本 [`scripts/export-study.lua`](../scripts/export-study.lua) 会：
   - 将 `00_room_base` 按 `3×` 导出为 `study.png`（`1920×1080`）；
   - 将 `99_hotspot_mask` 按原尺寸导出为 `hotspots.png`，并计算六栏目包围盒；
   - 裁剪每个非空零件的透明边，按 `3×` 导出单张 PNG 或多帧横向精灵图到 `public/art/study/props/`；
   - 将 `artwork/study/room/tiles/` 中的四周延展图按 `3×` 导出到 `public/art/study/tiles/`；
   - 将 `artwork/study/ui/*.png` 按 `3×` 导出到 `public/art/study/ui/`；
   - 自动更新 [`src/study-scene.json`](../src/study-scene.json)。
3. 如果要从源素材重建母版或重铺底图与透视延展：
   ```powershell
   npm.cmd run art:init
   npm.cmd run art:repave   # 先从 tiles/ 重铺墙/踢脚/透视地面与延展图，再重建母版并导出
   ```
   `art:init` / `art:repave` 会覆盖母版；直接改母版后请用 `art:export`。

### 便签、动画与书柜

- **便签**：打开 `35_notice_papers`，复制任意一张纸片的**整个图层**，在第 1 帧移到软木板上。图层名是标题，**Layer Properties → User Data** 是正文（支持换行和中文）；隐藏或删除图层即可取下。
- **动画与光**：壁灯灯座共用 `wall-lamp.png`，四帧火苗为 `wall-lamp-flame-1…4.png`；屏幕光点在 `prop_monitor_pulse` 的四帧里移动。每帧速度由 `scripts/export-study.lua` 的 `durationMs` 控制（壁灯 `240ms`，屏幕 `900ms`）。
- **书柜**：展开 `20_furniture/prop_bookcase` 可逐层挪动书组或第三层的黄铜四面体，整个书柜统一导出为一张 `props/bookcase.png`。

---

## 2. 修改墙面、踢脚线与一点透视地面（Tiled 素材）

核心底图与四周延展带都由 [`scripts/pave-floor.lua`](../scripts/pave-floor.lua) 根据 [`artwork/study/room/tiles/`](../artwork/study/room/tiles/) 下的三份 1× 源图统一生成：

| 源素材（1×） | 作用 | 说明 |
| --- | --- | --- |
| `wall-tile.png` | 无缝石砖墙循环块 | 同时用于核心墙面（`y=0..291`）、左右延展墙面与上方延展带 |
| `plinth-stones.png` | 10px 凿石踢脚条石 | 贴在 `y=292..301`，衔接冷灰石墙与暖灰地面 |
| `floor-pavers.png` | 8 块 `32×32` 世界 UV 石砖纹理 | 按 `FLOOR_PAL` 8 阶灰岩色阶投影到地面与左/右/下连续透视延展带 |

调整方式：
- **微调材质/石纹**：直接用 Aseprite 打开上述三张 1× PNG 修改并保存，再跑 `npm.cmd run art:repave`。
- **微调透视角度或砖块大小**：打开 [`scripts/pave-floor.lua`](../scripts/pave-floor.lua) 修改顶部的相机常数：
  - `VY`（默认 `60`）：调大让透视更陡、调小让砖缝更平缓；
  - `FX`（默认 `242 / 36`）：控制砖块宽度（分母越大，地砖越宽）；
  - `ROW_PITCH_Z`（默认 `0.215`）：控制砖块纵深（值越大，每排地砖越厚、排数越少）。
  改完运行 `npm.cmd run art:repave` 即可同步重算核心底图与 `side-left` / `side-right` / `floor-bottom-tile`。

---

## 3. 修改像素 UI 边框与单栏目弹窗皮肤

1× UI 像素源稿位于 [`artwork/study/ui/`](../artwork/study/ui/)，由 `art:export` 按 3× 导出到 `public/art/study/ui/`：

| 素材 | 1× 尺寸 | 用途 |
| --- | --- | --- |
| `panel-frame.png` | `32×32`（四角切片 `12`，3× 对应 `slice=36`） | 主弹窗九宫格像素框（含外探哥特角与实色深青黑内底） |
| `panel-close.png` | `22×11`（左 `11×11` 常态、右 `11×11` 悬停） | 弹窗右上角关闭按钮双态精灵图 |
| `label-frame.png` | `16×16`（四角切片 `5`，3× 对应 `slice=15`） | 物件悬停标签九宫格细框 |

如需为某个栏目（如 `research` 黑板风、`notice` 便签纸风）设计独立弹窗皮肤：
1. 在 `artwork/study/ui/` 新增一张 `32×32` 九宫格图（如 `panel-research.png`），运行 `npm.cmd run art:export`；
2. 在 [`src/style.css`](../src/style.css) 的弹窗区按 `data-panel` 覆盖变量即可：
   ```css
   .panel[data-panel="research"] {
     --panel-frame: url('/art/study/ui/panel-research.png');
     --panel-accent: #89e28a;
   }
   ```

---

## 4. 修改栏目正文、门外风景与背景音乐

- **五个学术栏目**：直接编辑 [`content/home/`](../content/home/) 下对应的 HTML（`profile.html`、`notes.html`、`news.html`、`research.html`、`quests.html`），刷新后检查物件点击、顶部导航和 `#hash` 锚点。
- **门外风景**：替换 [`public/art/study/outside.svg`](../public/art/study/outside.svg)（推荐 16:9 横图），并更新 [`index.html`](../index.html) 中 `#door-dialog` 内的 `<img>` 与 `<figcaption>`。
- **背景音乐**：替换 [`public/audio/study/medieval-abbey.mp3`](../public/audio/study/medieval-abbey.mp3) 时同步更新 `<audio>` 源文件、页脚署名和 [`CREDITS.md`](../CREDITS.md)。

---

## 5. 验收与构建

1. 刷新首页，检查六处初次微光提示；用鼠标悬停或 Tab 确认六个热点、三张便签的轮廓与正上方像素标签。
2. 逐个点击 News、Research、About、Notes、Side quests、三张便签和木门；确认弹窗像素边框、`×` 按钮默认无聚焦外框、`Esc` 关闭和网址锚点。
3. 拉宽（21:9）和拉高（16:10 / 4:3 / 竖屏桌面）浏览器窗口，确认四周延展带与透视地砖严丝合缝、无黑边与回卷错位。
4. 访问 `?debug=hotspots` 检查 640×360 合成掩膜。
5. 运行构建：
   ```powershell
   npm.cmd run build
   ```

早期概念、像素测试和手描工程保留在 [`artwork/study/archive/`](../artwork/study/archive/)，不参与运行或导出。
