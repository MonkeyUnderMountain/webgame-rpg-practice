# 修改指南

先启动[本地开发服务器](../README.md#run-locally)（`npm.cmd run dev`），打开 Vite 打印的本地地址。

---

## 1. 用 Aseprite 修改像素零件、帧动画与热点掩膜

书房场景采用 **`960×540`（16:9）基准网格、导出 `2×`（`1920×1080`）** 的分层工作流。所有美术图层集中在唯一主工程文件：

- **Aseprite 主工程**：[`artwork/study/study-master.aseprite`](../artwork/study/study-master.aseprite)（`960×540`，4 帧循环动画，每帧 `180ms`）

### 主工程图层结构

| 图层 / 图层组 | 作用 |
| --- | --- |
| `00_room_base` | `960×540` 书房底图（已清理黑板粉笔字与静态烛火苗） |
| `30_chalkboard/prop_chalkboard_d1..d3` | 黑板的三套可切换像素数学图（射影几何 / 同调代数蛇引理 / 拓扑环面与三叶结） |
| `30_chalkboard/prop_chalk_tray` | 黑板下沿的粉笔与板擦托槽（点击循环切换黑板上的数学图） |
| `80_candles/prop_candle_*_lit` | 石柱、书桌、窗下长凳三支蜡烛的点亮状态（4 帧摇曳火苗） |
| `80_candles/prop_candle_*_unlit` | 三支蜡烛的熄灭状态（变暗烛身 + 烛芯余烬 + 4 帧袅袅青烟） |
| `99_hotspot_mask` | 六大主栏目的 `960×540` 颜色索引掩膜层（默认隐藏） |

### 修改或新增零件的步骤

1. 用 Aseprite 打开 `artwork/study/study-master.aseprite`：
   - 按 **`Enter`** 可直接在 Aseprite 内预览 4 帧烛火动画；
   - 点击图层左侧的**眼睛图标**可切换查看隐藏的状态层（如 `prop_chalkboard_d2`、`prop_chalkboard_d3` 或 `*_unlit`）；
   - 如果想新增一个独立零件（例如把书架上的乌鸦或新家具拆成独立层），只需新建一个以 `prop_` 开头的图层（如 `prop_crow`），在 `960×540` 画布对应位置绘制即可。
2. 保存 `.aseprite` 文件后，在终端运行一键导出命令：
   ```powershell
   npm.cmd run art:export
   ```
   导出脚本 [`scripts/export-study.lua`](../scripts/export-study.lua) 会自动：
   - 将 `00_room_base` 按 `2×` 导出为 `public/art/study/mage/study.png`（`1920×1080`）；
   - 将 `99_hotspot_mask` 导出为 `public/art/study/mage/hotspots.png`（`960×540`），并自动计算六大主栏目的包围盒；
   - 自动计算每个零件图层在 `960×540` 画布上的最小非透明包围盒 `(x, y, width, height)`，裁掉透明边并按 `2×` 导出单张 PNG 或多帧横向 Sprite Sheet 到 `public/art/study/mage/props/`；
   - 自动更新 [`src/study-scene.json`](../src/study-scene.json)。
3. **自动轮廓与像素命中**：凡是在 `study-scene.json` 中标记为 `interactive: true` 的零件，前端会直接读取其 PNG 的 `Alpha ≥ 16` 不透明像素生成点击命中区与 Marching Squares 金色描边，无需任何手工涂抹。
4. 如果想从原始母图（`artwork/study/source-room.png` 与 `source-hotspots.png`）重新初始化生成 `study-master.aseprite`，可运行：
   ```powershell
   npm.cmd run art:init
   ```

---

## 2. 修改数学笔记或其他栏目正文

五个学术栏目各对应 `content/home/` 下的一份 HTML：

| 栏目 | 书房物件 | 文件 |
| --- | --- | --- |
| About | 书桌 | [`content/home/profile.html`](../content/home/profile.html) |
| Notes | 书架 | [`content/home/notes.html`](../content/home/notes.html) |
| News | 布告栏 | [`content/home/news.html`](../content/home/news.html) |
| Research | 黑板 | [`content/home/research.html`](../content/home/research.html) |
| Side quests | 长凳 | [`content/home/quests.html`](../content/home/quests.html) |

以修改笔记为例：打开 [`content/home/notes.html`](../content/home/notes.html)，正文里每段 `<article>` 是一条笔记。修改标题、简介或 PDF 链接，或者复制一段 `<article>` 新增条目。保存后分别从书房物件、顶部导航以及 `#notes` 锚点各打开一次确认排版正常。

---

## 3. 更换门外的风景照

点击右侧房门或页脚的 **Look outside** 会打开门外风景弹窗（当前为 [`public/art/study/mage/beyond.svg`](../public/art/study/mage/beyond.svg)）。想换成新的像素风景画或照片时：

1. 把图片放进 `public/art/study/mage/`（推荐 `960×540` 或 `1920×1080` 的 16:9 横图）。
2. 打开 [`index.html`](../index.html)，找到 `#door-dialog` 里的 `<figure class="door-figure">`，更新 `<img src="...">`、`alt` 和 `<figcaption>` 说明文字。

---

## 4. 更换或压缩书房背景音乐

书房底部的 **Music** 开关控制 [`public/audio/study/medieval-abbey.mp3`](../public/audio/study/medieval-abbey.mp3)。播放与淡入淡出逻辑在 [`src/music.ts`](../src/music.ts)。换曲时同步更新 [`index.html`](../index.html) 中的 `<audio>` 源文件、页脚署名以及 [`CREDITS.md`](../CREDITS.md)。

---

## 5. 验收与构建

1. 刷新首页，检查初次加载时的微光轮廓提示；用鼠标悬停或按 `Tab` 键，确认六个主栏目物件、三支蜡烛和黑板下沿粉笔槽的金色轮廓与标签正常。
2. 点击三支蜡烛测试点亮/吹灭动画与环境光联动；点击黑板下沿粉笔槽测试切换三幅数学粉笔图。
3. 访问 `?debug=hotspots` 检查 `960×540` 合成命中掩膜。
4. 运行构建命令验证 TypeScript 类型检查并生成 `dist/` 静态站点：

```powershell
npm.cmd run build
```
