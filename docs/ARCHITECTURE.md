# 书房主页架构说明

## 1. 数据流：从 Aseprite 主工程到浏览器

```text
artwork/study/room/study-master.aseprite (640×360, 4 帧循环时间轴)
  │
  ├─ npm.cmd run art:export (scripts/export-study.mjs -> export-study.lua)
  │
  ├──► public/art/study/study.png        (3× 导出：1920×1080 书房底图)
  ├──► public/art/study/hotspots.png     (1× 导出：640×360 六栏目颜色掩膜)
  ├──► public/art/study/props/*.png      (3× 导出：自动裁剪透明边的零件与多帧横向精灵表)
  └──► src/study-scene.json              (自动计算的 640×360 坐标、帧率与交互状态清单)
```

`study.png` 只包含 `00_room_base`（墙、窗洞、地面和墙脚）。窗景、窗框、门、黑板、桌椅、书柜、灯光与便签都是独立 PNG 零件，按场景清单的百分比坐标叠在底图上。

## 2. 页面入口与运行时

1. [`index.html`](../index.html) 定义书房画布、顶部导航、页脚、阅读卷轴（`#section-dialog`）与门外风景弹窗（`#door-dialog`）。
2. [`src/main.ts`](../src/main.ts) 启动时依次挂载：
   - `mountStudy()`：底图、模块化零件、SVG 描边和热点；
   - `mountMusic()`：背景音乐开关；
   - `mountReadingPanel()`：五个内容栏目和三张便签；
   - `mountDoorDialog()`：门外风景。
3. [`src/study.ts`](../src/study.ts) 读取 [`src/study-scene.json`](../src/study-scene.json)：
   - 底图按 640×360 逻辑画布缩放；
   - 零件用绝对百分比定位；
   - 多帧零件使用横向 Sprite Sheet + CSS `steps(N)` 播放整数像素帧动画；
   - 六栏目和三张便签共享同一个 SVG 金色轮廓层。

## 3. 六个栏目热点

`99_hotspot_mask` 是默认隐藏的 640×360 颜色掩膜层。初始化脚本直接从物件 Alpha 轮廓填入颜色：

| 栏目 | 物件 | 掩膜来源 |
| --- | --- | --- |
| News | 软木公告板 | `noticeboard.png` |
| Research | 黑板 | `chalkboard-frame.png` |
| About | 书桌 + 椅子 | `desk.png` + `desk-chair.png` |
| Notes | 书柜 | `bookcase/frame.png` |
| Side quests | 桌边纸箱 | `supply-box.png` |
| Look outside | 木门 | `door.png` |

颜色必须与 [`scripts/export-study.lua`](../scripts/export-study.lua) 的 `SECTION_SPECS` 一致。导出器扫描 `hotspots.png`，计算每个栏目的包围盒并写入场景清单；运行时用 `decodeMask()` 建立命中表，再用 Marching Squares 追踪外轮廓。因此轮廓贴着门、书柜和黑板，而不是手画矩形。

三张便签不在掩膜层里：它们是运行时读取自身 PNG 的 `Alpha ≥ 16` 生成命中区和轮廓，并覆盖在公告板之上。点便签读短文，点板面打开 News。

## 4. 阅读卷轴与路由

[`src/readingPanel.ts`](../src/readingPanel.ts) 用 Vite 的 `?raw` 导入 `content/home/` 下的五份 HTML。无论是点击书房物件、顶部导航，还是直接访问 `#notes` 之类的网址，都会同步浏览器历史记录并展开卷轴。便签按钮带有 `data-notice-text`，点击后在同一卷轴里显示标题和正文。

关闭卷轴时清除网址锚点；如果焦点还停在书房场景内，会主动移开，避免鼠标用户看到残留的悬停标签。

## 5. 门外风景与音乐

- 门热点是按钮而不是栏目链接，点击后打开 `#door-dialog`；页脚 **Look outside** 也触发同一弹窗。图片是 [`public/art/study/outside.svg`](../public/art/study/outside.svg)。
- [`src/music.ts`](../src/music.ts) 控制 `#study-music` 与页脚开关。默认关闭（`preload="none"`），播放时淡入，切到后台标签页时暂停。

## 6. 调试与构建

- `?debug=hotspots`：在画面上叠加 640×360 彩色命中掩膜和全部金色轮廓。
- `npm.cmd run build`：`tsc --noEmit` 类型检查后由 Vite 生成 `dist/`。
- `npm.cmd run art:init`：从 `room-base.png`、`props/` 和参考图重建母版；`npm.cmd run art:repave` 会先用 `tiles/large-flagstones.png` 重铺地面。
