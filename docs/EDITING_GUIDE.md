# 修改指南

先启动[本地开发服务器](../README.md#run-locally)（`npm.cmd run dev`），打开 Vite 打印的本地地址。首页 `/` 就是 640×360 书房。

---

## 1. 用 Aseprite 修改像素零件、帧动画与热点掩膜

唯一主工程是 [`artwork/study/room/study-master.aseprite`](../artwork/study/room/study-master.aseprite)（`640×360`，`3×` 导出，4 帧循环，每帧 `180ms`）。它由底图、原生尺寸零件和参考图重建；缩放后的参考图保存在隐藏层 `_ref_reference`。

### 图层结构

| 图层 / 图层组 | 作用 |
| --- | --- |
| `00_room_base` | 石砖墙、窗洞、带苔墙脚和地面（不含家具） |
| `05_floor_light` | 地面冷影、壁灯暖光、窗光，均在家具下方 |
| `10_beyond/prop_window_view` | 窗外天空、山谷和浮空城堡 |
| `20_furniture` | 窗框、门、黑板框、壁灯、桌、电脑、书、椅子、书柜 |
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

颜色必须与 [`scripts/export-study.lua`](../scripts/export-study.lua) 的 `SECTION_SPECS` 完全一致。初始化脚本会按物件 Alpha 自动生成掩膜；如果你在 Aseprite 里移动了物件，也要同步移动 `99_hotspot_mask` 里对应的色块，或者在 [`scripts/init-study-master.lua`](../scripts/init-study-master.lua) 的 `sectionMasks` 表里更新坐标。

三张便签不涂在掩膜层：它们是独立图层，导出后由前端读取 PNG 的 Alpha 生成命中区和金色轮廓，并盖在公告板之上。

### 修改或新增零件

1. 用 Aseprite 打开 `artwork/study/room/study-master.aseprite`。
   - 按 **`Enter`** 预览 4 帧动画。
   - 用眼睛图标切换隐藏层。
   - 新增独立零件时，新建以 `prop_` 开头的图层，在 640×360 画布对应位置绘制；导出脚本会自动发现并写入场景清单。
2. 保存 `.aseprite` 后运行：
   ```powershell
   npm.cmd run art:export
   ```
   导出脚本 [`scripts/export-study.lua`](../scripts/export-study.lua) 会：
   - 将 `00_room_base` 按 `3×` 导出为 `study.png`（`1920×1080`）；
   - 将 `99_hotspot_mask` 按原尺寸导出为 `hotspots.png`，并计算六栏目包围盒；
   - 裁剪每个非空零件的透明边，按 `3×` 导出单张 PNG 或多帧横向 Sprite Sheet 到 `public/art/study/props/`；
   - 自动更新 [`src/study-scene.json`](../src/study-scene.json)。
3. 如果要从源素材重建母版：
   ```powershell
   npm.cmd run art:init
   npm.cmd run art:repave   # 需要重新铺地面时
   ```
   `art:init` 会覆盖母版；直接改母版后请用 `art:export`。

### 便签

打开 `35_notice_papers`，复制任意一张纸片的**整个图层**，在第 1 帧移到软木板上。图层名是标题，**Layer Properties → User Data** 的文本是访客读到的正文（支持换行和中文）。空正文只显示纸片；隐藏或删除图层就能取下便签。保存后运行 `art:export`。

### 动画与光

- 壁灯灯座共用 `wall-lamp.png`，四帧火苗是 `wall-lamp-flame-1…4.png`。墙光 `prop_wall_lamp_glow` 和地面光池是独立静态层，不随火苗闪烁。
- 屏幕光点在 `prop_monitor_pulse` 的四帧里移动。每帧速度由 `scripts/export-study.lua` 的 `durationMs` 控制：壁灯 `240ms`，屏幕 `900ms`。
- 书柜第三层的黄铜四面体是 `shelf_3/tetrahedron`，可以单独隐藏或移动；整个书柜仍然只导出一张 `props/bookcase.png`。

### 地面

地面用 [`artwork/study/room/tiles/large-flagstones.png`](../artwork/study/room/tiles/large-flagstones.png) 的六块 112×24 大石板，四排错缝铺成。石板原稿使用房间调色板的暖灰 ramp（索引 8–15）。修改原稿后运行 `npm.cmd run art:repave`，它会先重铺 `room-base.png`，再重建母版并导出。

---

## 2. 修改栏目正文

五个学术栏目对应 `content/home/` 下的一份 HTML：

| 栏目 | 书房物件 | 文件 |
| --- | --- | --- |
| About | 书桌 + 椅子 | [`content/home/profile.html`](../content/home/profile.html) |
| Notes | 书柜 | [`content/home/notes.html`](../content/home/notes.html) |
| News | 公告板 | [`content/home/news.html`](../content/home/news.html) |
| Research | 黑板 | [`content/home/research.html`](../content/home/research.html) |
| Side quests | 桌边纸箱 | [`content/home/quests.html`](../content/home/quests.html) |

修改标题、简介或链接后，分别从物件、顶部导航和 `#notes` 等锚点各打开一次，确认卷轴排版正常。

---

## 3. 更换门外的风景

点击木门或页脚的 **Look outside** 会打开门外弹窗（当前为 [`public/art/study/outside.svg`](../public/art/study/outside.svg)）。换图时：

1. 把图片放进 `public/art/study/`（推荐 16:9 横图）。
2. 打开 [`index.html`](../index.html)，找到 `#door-dialog` 里的 `<figure class="door-figure">`，更新 `<img src="...">`、`alt` 和 `<figcaption>`。

---

## 4. 更换或压缩背景音乐

页脚 **Music** 开关控制 [`public/audio/study/medieval-abbey.mp3`](../public/audio/study/medieval-abbey.mp3)，逻辑在 [`src/music.ts`](../src/music.ts)。换曲时同步更新 `<audio>` 源文件、页脚署名和 [`CREDITS.md`](../CREDITS.md)。

---

## 5. 验收与构建

1. 刷新首页，检查六处初次微光提示；用鼠标悬停或 Tab 确认六个热点、三张便签的金色轮廓和标签。
2. 逐个点击 News、Research、About、Notes、Side quests 和木门；确认卷轴标题、正文、`Esc` 关闭和网址锚点。
3. 点三张便签，确认短文正确，且公告板 News 仍可点。
4. 访问 `?debug=hotspots` 检查 640×360 合成掩膜。
5. 运行构建：
   ```powershell
   npm.cmd run build
   ```

早期概念、像素测试和手描工程保留在 [`artwork/study/archive/`](../artwork/study/archive/)，不参与运行或导出。
