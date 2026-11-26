# 修改指南

先启动[本地开发服务器](../README.md#run-locally)，打开 Vite 打印的地址。改文件后浏览器可能会刷新，当前游戏进度也会随之结束。

## 1. 修改一条数学笔记

打开 [`content/home/notes.html`](../content/home/notes.html)。文件开头是面板的眉题和标题，正文里每段 `<article>` 是一条笔记。例如，找到 `Hodge Index Theorem via Linear Algebra` 那一段，改 `<h3>` 里的标题、`<p>` 里的简介，或者把 `<a href="…">` 里的地址换成新 PDF 的完整网址。新增笔记时可以复制一段 `<article>` 再改这三处。沿用链接上的 `target="_blank"` 和 `rel="noopener noreferrer"`。PDF 会在新标签页打开，游戏页面和本局进度还在。

顶部的 **Notes** 和房间里的书架读取的是同一段内容。保存后，两种入口都点一次，再打开 PDF 确认地址正确。也可以直接打开本地地址加 `#notes`，检查访客从分享链接能否进入笔记面板。

另外三个栏目也各有一份 HTML。个人简介在 [`profile.html`](../content/home/profile.html)，研讨班时间和地点在 [`news.html`](../content/home/news.html)，项目和小说链接在 [`quests.html`](../content/home/quests.html)。

## 2. 改游戏对白或战斗预览

打开 [`content/game/world.json`](../content/game/world.json)。要改落脚点旅人的第一句对白，展开 `waystation → wayfarer → beforeCrossing`，修改右侧引号里的文字。走过隐桥后再找旅人聊天，显示的是同组的 `afterCrossing`。遗迹的断桥提示在 `ruin → bridge`，其中 `lampPrompt` 是持灯时显示的操作提示。触发对白的时机、取得灯和点亮桥的条件都在 [`src/game.ts`](../src/game.ts)。

战斗预览写在 [`content/game/interface.json`](../content/game/interface.json) 的 `encounter` 中。`canWin` 用于能承受伤害的情况，`tooDangerous` 用于血量不足的情况。改措辞时，保留 `{damage}` 和 `{health}` 两个占位符。走近哨兵并打开预览，可以看到页面填入本次预计伤害和玩家当前血量。

## 3. 移动落脚点的旅人

在 [maps.ts](../src/game/maps.ts) 找到 `WAYFARER`。坐标按 `[列, 行]` 排列，向右列数增加，向下行数增加。例如，把 `[10, 10]` 改成 `[11, 10]`，旅人就会向右移动一格。[游戏场景](../src/game.ts) 的 `drawWaystation()` 用这一处坐标摆放人物、占用地块并注册对话位置。

保存后从书房出门。先走过原来的格子，再走到旅人身边按 **E**，确认能说话，向旅人所在的格子走时会被挡住。选择新位置时，在旁边留一格可走的地面，方便访客靠近。

## 4. 调整书房热点与轮廓

书房底图是 [`public/art/study/mage/study.png`](../public/art/study/mage/study.png)（1672×941）。热点数据在 [`src/study-hotspots.json`](../src/study-hotspots.json)，按 **557×313 逻辑像素**记录六个多边形：`1 News`、`2 Research`、`3 About`、`4 Notes`、`5 Side Quests`、`6 Enter`。

[`src/study.ts`](../src/study.ts) 读取这些点，计算每个多边形的包围盒、SVG 轮廓和 `clip-path`；悬停或按 `Tab` 时显示金色轮廓和标签。六个热点共用一个 `viewBox="0 0 557 313"` 的 SVG，轮廓随底图缩放。

调整某个物件时：

1. 用 `npm.cmd run dev` 打开 [`label-tool.html`](../artwork/homepage-concepts/preview/label-tool.html)。
2. 用 **Line / Brush / Fill** 修边界，导出 `label-map.png`。
3. 按 557×313 的像素坐标更新 `src/study-hotspots.json` 中对应 label 的 `polygons`。
4. 刷新首页，用鼠标和 `Tab` 各选一次六个物件，在桌面和手机宽度下检查轮廓、标签和点击区域。

旧的 `public/art/study/outlines/*.png` 是上一版五热点的遗留资产，当前 `study.ts` 不再读取它们。

## 5. 在遗迹里接通一条路

地图定义在 [`src/game/maps.ts`](../src/game/maps.ts) 的 `layout()`。左上角的格子是 `[0, 0]`。地图有 32 列、17 行，每格 24 像素。`rect(left, top, right, bottom, tile)` 会填满矩形，包含右端和下端。后画的地块会覆盖先画的地块，所以放置顺序很重要。

例如，遗迹左侧的下层大厅在第 9 行有地面，上方通道在第 7 行有地面。可以在遗迹分支的普通地块之后、`if (sideGateOpen)` 之前加下面一行，补上中间缺的那一格。

```ts
rect(10, 7, 10, 9, 'stone');
```

从 `[10, 9]` 往上走到 `[10, 7]`，确认这条路能双向通过。`stone` 是可通行地形，墙和深渊会挡路。即使地面类型可走，场景里用 `block()` 标出来的格子仍会挡路。想调整走路速度，可以查看 [`src/game/movement.ts`](../src/game/movement.ts) 的 `WALK_SPEED`，单位是像素每秒。改动后也走一遍原来的灯和隐桥路线，确认新路没有跳过原本要找的能力。

如果后续要加一张地图，先看 `maps.ts` 的 `Area` 和 `layout()`，再看[游戏场景](../src/game.ts)的 `drawArea()` 怎样按区域绘制。地点名称和任务提示放在 `content/game/world.json`。参考 `drawWaystation()` 和 `drawRuin()` 里的 `portal()` 成对添加游戏内的出入口，两端都要选可走的落脚格。落脚点通往书房的门由页面处理。

## 6. 换一张游戏像素图

在 [`public/art/world/`](../public/art/world/) 里按要改的对象找图。

| 目录 | 用途 | 例子 |
| --- | --- | --- |
| `tiles/` | 铺地图用的 24 × 24 像素地块 | 石墙 `ruinWall.png`、桥面 `bridge.png` |
| `scenery/` | 摆在地图上的布景 | 树 `tree.png`、路牌 `sign.png` |
| `objects/` | 门、道具和互动提示 | 传送门 `portal.png`、灯 `lamp.png` |
| `characters/` | 主角的四个朝向、NPC 和敌人 | 主角正面 `heroDown.png`、哨兵 `enemy.png` |

- **直接换图**。想改遗迹的石墙，可以替换 [`tiles/ruinWall.png`](../public/art/world/tiles/ruinWall.png)。替换树、角色等立绘时，先对照原图尺寸和透明区域，把物件保留在画布里原来的位置。
- **改绘图脚本**。要让改动可以重新生成，编辑 [`tools/draw_pixel_art.py`](../tools/draw_pixel_art.py) 里绘制对应素材的函数，再从仓库根目录运行下面的命令。脚本会写入 `public/art/world/` 的 25 张户外素材，并顺带生成 `archive/art/` 下的 10 张归档素材（旧书房的地块家具和备用萤火虫）。`archive/` 在 Vite 的静态资源目录之外，属于存档，仓库里目前没有这个目录，运行脚本时会自动创建。脚本会覆盖同名图片，若要保留手工修改，可先备份。

```powershell
python tools/draw_pixel_art.py
```

新增户外素材时，把 PNG 放进相应目录，并在 [`src/art.ts`](../src/art.ts) 的对应分类下登记文件名（省略 `.png`）。地图和场景用这个名字引用纹理。换图后刷新，确认图像清晰，位置和碰撞范围对得上。首页插图和热点轮廓按第 4 节的方法对齐。

## 7. 更换书房背景音乐

书房底部的 **Music** 开关控制 [`public/audio/study/medieval-abbey.mp3`](../public/audio/study/medieval-abbey.mp3)。播放、淡入淡出和切到后台标签页时暂停都在 [`src/music.ts`](../src/music.ts)；按钮和 `<audio>` 元素在 [`index.html`](../index.html)。默认关闭，浏览器不会自动播放。

当前曲目是 matthewmikemusic 的 *Medieval Abbey*，来自 [Pixabay](https://pixabay.com/music/ambient-medieval-abbey-182197/)，按 [Pixabay Content License](https://pixabay.com/service/license-summary/) 使用。该许可证不强制署名，但本站仍在页脚保留曲名、作者和许可证链接；换曲时同时更新 `<audio>` 的源文件和页脚 `music-credit`。如果新曲使用不同许可证，按该许可证更新署名。

## 改完怎么验收

日常小改动先走一遍受影响的路径。改地图或互动时，可以按下面的顺序手测。

1. 在书房用鼠标悬停或按 `Tab`，观察书架轮廓。分别点击书架和导航的 **Notes**，应打开同一份资料。用桌面和手机宽度各检查一次。
2. 点击房门，经落脚点进入遗迹。先看断桥，再去北边找哨兵。取消战斗预览时血量不变，确认时按预览扣血。另开一局还可以试用绞盘绕过哨兵。
3. 拿到灯，回有记号的桥边按 `E`。先上桥再退回原岸，目标应仍要求过桥。再走到对岸，确认目标变成已完成。回到落脚点，经门返回书房。再点房门时，应从落脚点继续同一局，能力和已开的路仍在。
4. 用手机或浏览器的触屏模拟，确认书房插图完整显示、按钮对准物件。进入游戏后，试方向键和 **Interact**，确认松开方向按钮时，人物停止移动。

最后运行下面的命令。它会先做 TypeScript 类型检查，再生成 `dist/` 里的静态网页。地图能不能走通、互动位置合不合适，仍靠前面的实玩确认。

```powershell
npm.cmd run build
```

## 附录 · 书房原图的生成提示

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
