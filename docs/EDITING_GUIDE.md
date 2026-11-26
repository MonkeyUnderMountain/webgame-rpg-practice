# 修改指南

先启动[本地开发服务器](../README.md#run-locally)，打开 Vite 打印的地址。

## 1. 修改数学笔记或其他栏目

五个栏目各对应 `content/home/` 下的一份 HTML：

| 栏目 | 书房物件 | 文件 |
| --- | --- | --- |
| About | 书桌 | [`content/home/profile.html`](../content/home/profile.html) |
| Notes | 书架 | [`content/home/notes.html`](../content/home/notes.html) |
| News | 布告栏 | [`content/home/news.html`](../content/home/news.html) |
| Research | 黑板 | [`content/home/research.html`](../content/home/research.html) |
| Side quests | 长凳 | [`content/home/quests.html`](../content/home/quests.html) |

以修改笔记为例：打开 [`content/home/notes.html`](../content/home/notes.html)，文件开头是卷轴眉题和标题，正文里每段 `<article>` 是一条笔记。修改标题、简介或 PDF 链接，或者复制一段 `<article>` 新增条目。沿用外链上的 `target="_blank"` 和 `rel="noopener noreferrer"`，PDF 会在新标签页打开。

保存后，分别从书房物件、顶部导航以及直接访问 `#notes` 锚点各打开一次，确认排版与链接正常。

## 2. 更换门外的风景照

目前点击房门或页脚的 **Look outside** 会打开一张暮色占位图（[`public/art/study/mage/beyond.svg`](../public/art/study/mage/beyond.svg)）。以后想换成真实风景照或新画的像素风景时：

1. 把图片放进 `public/art/study/mage/`（例如 `beyond.jpg` 或 `beyond.png`，推荐 16:9 横图）。
2. 打开 [`index.html`](../index.html)，找到 `#door-dialog` 里的 `<figure class="door-figure">`，把 `<img src="./art/study/mage/beyond.svg" ...>` 改成新文件名，并更新 `alt`、`width`/`height` 和 `<figcaption>` 说明文字。
3. 刷新首页，点房门与页脚按钮检查画框显示和移动端缩放。

## 3. 用 Aseprite 修改可替换零件、帧动画与热点

书房采用 **`960×540`（16:9）基准网格、导出 `2×`（`1920×1080`）** 的 2D 分层工作流：

- **Aseprite 主工程**：[`artwork/study/study-master.aseprite`](../artwork/study/study-master.aseprite)（`960×540`，4 帧循环动画，每帧 `180ms`）。
- **一键导出命令**：在项目根目录运行 `npm.cmd run art:export`，脚本 [`scripts/export-study.mjs`](../scripts/export-study.mjs) 会调用本机 Aseprite CLI 执行 [`scripts/export-study.lua`](../scripts/export-study.lua)：
  1. 将 `00_room_base` 按 `2×` 整数放大导出为 [`public/art/study/mage/study.png`](../public/art/study/mage/study.png)（1920×1080）；
  2. 将 `99_hotspot_mask` 导出为 [`public/art/study/mage/hotspots.png`](../public/art/study/mage/hotspots.png)（960×540）；
  3. 自动计算每个零件图层在 `960×540` 画布上的非透明像素最小包围盒 `(x, y, width, height)`，裁剪透明边并按 `2×` 导出单帧 PNG 或多帧横向 Sprite Sheet 到 `public/art/study/mage/props/`；
  4. 自动更新 [`src/study-scene.json`](../src/study-scene.json)，无需手工填写任何坐标。

### 在 Aseprite 中修改现有零件或新增零件

1. 用 Aseprite 打开 `artwork/study/study-master.aseprite`：
   - `30_chalkboard` 组内包含 `prop_chalkboard_d1`、`prop_chalkboard_d2`、`prop_chalkboard_d3`（三套可切换黑板数学图）以及 `prop_chalk_tray`（黑板下沿粉笔与板擦触发区）；
   - `80_candles` 组内包含石柱、书桌、长凳三支蜡烛的 `*_lit`（4 帧跳动火苗）与 `*_unlit`（4 帧袅袅青烟）图层；
   - 若想新增一个自定义静态或动画零件，只需新建一个以 `prop_` 开头的图层（例如 `prop_crow` 或 `prop_bookshelf`），在 `960×540` 画布对应位置绘制即可。
2. 保存 `.aseprite` 文件后，在终端运行：
   ```powershell
   npm.cmd run art:export
   ```
3. **自动命中与金色描边**：对于 `study-scene.json` 中 `interactive: true` 的独立零件，[`src/study.ts`](../src/study.ts) 会直接读取该零件 PNG 的 `Alpha ≥ 16` 不透明像素写入 `960×540` 命中掩膜，并用 Marching Squares 自动追踪出悬停金色轮廓——**只要在 Aseprite 里改了零件形状并导出，网页上的点击区域和金色描边会自动跟着更新**。

### 调整六大主栏目的基础掩膜（`hotspots.png`）

六大主栏目（`1 News`、`2 Research`、`3 About`、`4 Notes`、`5 Side Quests`、`6 Look outside`）的基础命中掩膜位于 `public/art/study/mage/hotspots.png`（`960×540`）。你可以直接在 Aseprite 中打开并编辑 `study-master.aseprite` 的 `99_hotspot_mask` 图层后运行 `npm.cmd run art:export`，也可以使用网页标注工作台：

1. 用 `npm.cmd run dev` 启动后，打开 Vite 地址下的 `/artwork/homepage-concepts/preview/label-tool.html`（`960×540` 网格）。
2. 选标签（**0 背景**就是橡皮），用 **Brush / Line / Fill / Wand** 沿物体边缘收紧。
3. 点 **Save hotspots.png**，覆盖 `public/art/study/mage/hotspots.png`。刷新首页，访问 `?debug=hotspots` 可叠加显示全部栏目与微交互零件的掩膜和金色轮廓。

## 4. 更换或压缩书房背景音乐

书房底部的 **Music** 开关控制 [`public/audio/study/medieval-abbey.mp3`](../public/audio/study/medieval-abbey.mp3)。播放、淡入淡出和切到后台标签页时暂停都在 [`src/music.ts`](../src/music.ts)；按钮和 `<audio>` 元素在 [`index.html`](../index.html)。默认关闭，浏览器不会自动播放。

当前曲目是 matthewmikemusic 的 *Medieval Abbey*，来自 [Pixabay](https://pixabay.com/music/ambient-medieval-abbey-182197/)，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 使用。换曲时同步更新 `<audio>` 源文件和页脚 `music-credit`（以及 [`CREDITS.md`](../CREDITS.md)）。

如果音频文件偏大，可在装有 `ffmpeg` 的环境里压缩到 128 kbps：

```powershell
ffmpeg -i public/audio/study/medieval-abbey.mp3 -codec:a libmp3lame -b:a 128k public/audio/study/medieval-abbey-128k.mp3
```

## 改完怎么验收

1. 在书房刷新页面，观察初次加载时的柔光轮廓提示；用鼠标悬停或按 `Tab`，确认六个物件轮廓与标签对准。
2. 分别从书房物件、顶部导航和 `#notes` 锚点打开阅读卷轴，确认居中排版、滚动条、外链和火漆关闭按钮（点击按钮、点遮罩、按 `Esc`）正常。
3. 点击房门和页脚 **Look outside**，确认风景照弹窗能正常打开和关闭，关闭后焦点回到触发按钮。
4. 在桌面宽度和手机宽度（≤ 760px）各检查一次，并测试页脚音乐开关。

最后运行构建命令，它会先做 TypeScript 类型检查，再在 `dist/` 生成根域名静态站点：

```powershell
npm.cmd run build
```

## 附录 · 早期现代书房原图的生成提示（历史）

当前首页使用 [`public/art/study/mage/study.png`](../public/art/study/mage/study.png)。下面是更早一版现代书房的生成记录，仅作历史参考，不描述当前图像。

插图由内置 ImageGen 生成，并在同一工具中调整为现代书房。轮廓根据最终成图另画。

<details>
<summary>查看原始提示词</summary>

```text
Use case: illustration-story
Asset type: original, full-bleed pixel art background for the clickable homepage of a mathematics student, no interface drawn in art.
Create one complete, gorgeous wide 16:9 pixel art illustration of a modern private study at dusk, viewed diagonally from a corner near human eye level, looking slightly down so all objects can be seen. It should feel like carefully hand-placed 16-bit adventure game art, densely composed with controlled hard pixel clusters, clean 1–3 pixel details, selective dithering and two strong contrasting pools of light, not photorealistic or vector. Real modern room, no people. Deep ink-blue evening shadows, warm amber desk light, soft blue-violet window, honey wood floor and old teal upholstery.
Composition: A full-size walnut writing desk in the left foreground (roughly x 13–40%, y 52–85%), with a brass lamp, open mathematical notebook, a few books and a slightly pulled-back chair. On the left part of the back wall, above the desk, an independent framed chalkboard (x 18–41%, y 20–44%) bears only a few tiny geometric sketches. A tall, self-contained bookshelf on the center-left or center wall (x 43–57%, y 23–58%), filled with book spines. Central right window looks onto dusk. Under it sits a low cabinet (x 57–70%, y 61–81%) with a small but visually readable chunky retro game console and a little monitor, like a separate object someone could click. At the far right (x 72–88%, y 22–81%) an ordinary wooden door is ajar, letting vivid cool blue sky and a glimpse of pale stone road and a fantastical silhouette into the very modern room. The cool door spill extends diagonally into the floor. Keep desk, bookshelf, chalkboard, console and door visually distinct and in frame, with clean recognizable silhouettes. Give the scene believable two-wall perspective, patterned floor light, and a few lived-in details that don't obscure those five objects. Darker quieter top-left and top-right corners leave some space for independent HTML page title and nav; the image is still filled edge to edge with artwork.
Polished quiet atmosphere with a sense of another world just beyond. Palette accents of amber lamps, dusty cornflower blue and muted burgundy. No text, no logos, no watermark, no UI widgets, no hotspots, no decorative picture frame around the whole scene. Do not replicate any existing game artwork or interface.
```

</details>

<details>
<summary>查看最终现代书房的修改提示词</summary>

```text
Use case: style-transfer.
Edit the attached original pixel-art animated-game homepage background into a much more contemporary modern personal study. This is an image edit: preserve its wide approximately 16:9 edge-to-edge canvas, the diagonal near-eye-level camera, spatial composition, five main clickable zones and the exact basic layout: large writing desk and chair in left foreground, big framed BLACK chalkboard in the back left, upright bookshelf at center, window and a separate gaming rig on a low sideboard to the right, and half-open door far right. Preserve pixel art, story and lighting contrast: modern real-life study with warm desk light and cool dusk at the window; far-right door opens to a vivid bluish fantasy stone road and distant silhouettes. Keep the top corners quiet and dark for HTML UI.
Modernize the shapes and materials decisively. Give the desk a clean flat light-oak surface and slim graphite legs or clean flush drawers; replace vintage brass desk light with a slim matte black articulated LED desk lamp; include a clearly visible open thin modern laptop computer on the left desk next to the open mathematics notebook, at a naturally reachable desktop position with an unobscured readable keyboard silhouette. Replace antique thick bookcase with straight modular light oak or dark graphite open compartments, books still clearly visible, minimal ornament. Keep the chalkboard as a real dark writing board with a clean narrow aluminum border and three handwritten geometry diagrams. Use a minimal dark gray ergonomic chair, simple woven rug, modern black window frames, neutral shade or plain curtains, and restrained accessories like a plant and a mug. Replace the bulky CRT, old console and cords under the window with a contemporary thin flat-screen monitor, a recognizable standalone modern console in a simple upright or flat black-and-white enclosure, and a modern controller. Keep this gaming setup spatially separate from the computer on the desk. Use a sleek neutral real-world door with simple hardware and half-open silhouette, leaving a cool fantasy glimpse.
Use confident hand-placed 16-bit pixel clusters, hard stepped pixel edges, selective dithering and warm with blue-violet evening colors. Keep five silhouette regions separated and near the original positions, with no figure. Avoid ornate carved wood, brass knickknacks, elaborate rug patterns, vintage electronics and additional props. No readable text or brands, no labels, no UI, no baked hover outlines, no watermark.
```

</details>
