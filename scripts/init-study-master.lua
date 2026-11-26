-- scripts/init-study-master.lua
-- 初始化 960×540 (4 帧循环动画) 的 Aseprite 主工程：artwork/study/study-master.aseprite
-- 包含：
--   00_room_base           (清理了黑板粉笔字与静态烛火苗的 960×540 书房底图)
--   30_chalkboard/
--     prop_chalkboard_d1   (数学黑板状态 1：原始射影与神圣几何星图)
--     prop_chalkboard_d2   (数学黑板状态 2：同调代数、交换图与蛇引理)
--     prop_chalkboard_d3   (数学黑板状态 3：代数拓扑环面、三叶结与谱曲线)
--     prop_chalk_tray      (黑板下沿粉笔槽与板擦微交互触发件)
--   80_candles/
--     prop_candle_column_lit / unlit (石柱烛台：4 帧跳动火苗 / 4 帧熄灭青烟)
--     prop_candle_desk_lit   / unlit (书桌烛台：4 帧跳动火苗 / 4 帧熄灭青烟)
--     prop_candle_bench_lit  / unlit (窗下长凳烛台：4 帧跳动火苗 / 4 帧熄灭青烟)
--   99_hotspot_mask        (960×540 六大主栏目颜色索引掩膜层)

local BASE_W = 960
local BASE_H = 540
local NUM_FRAMES = 4
local FRAME_DURATION = 0.18

local rgba = app.pixelColor.rgba
local rgbaR = app.pixelColor.rgbaR
local rgbaG = app.pixelColor.rgbaG
local rgbaB = app.pixelColor.rgbaB
local rgbaA = app.pixelColor.rgbaA

local function clamp(v, lo, hi)
  if v < lo then return lo end
  if v > hi then return hi end
  return v
end

-- 1. 读取原始概念母图并缩放到 960×540 (Nearest-Neighbor)，保证重复 --init 幂等
local srcSpr = app.open("artwork/homepage-concepts/shortlist/09s-pixel-vivid-b-96.png")
app.activeSprite = srcSpr
app.command.ChangePixelFormat{ format="rgb" }
srcSpr:resize(BASE_W, BASE_H)
local rawImg = Image(srcSpr.cels[1].image)
srcSpr:close()

-- 读取原始热点掩膜并缩放到 960×540
local maskSpr = app.open("public/art/study/mage/hotspots.png")
app.activeSprite = maskSpr
app.command.ChangePixelFormat{ format="rgb" }
maskSpr:resize(BASE_W, BASE_H)
local rawMaskImg = Image(maskSpr.cels[1].image)
maskSpr:close()

-- 2. 创建 960×540 主工程 Sprite
local master = Sprite(BASE_W, BASE_H, ColorMode.RGB)
app.activeSprite = master
master.frames[1].duration = FRAME_DURATION
for f = 2, NUM_FRAMES do
  local frame = master:newEmptyFrame(f)
  frame.duration = FRAME_DURATION
end

-- 辅助函数：将单张图像复制到某个图层的全部 4 帧
local function fillAllFrames(layer, img, pos)
  local pt = pos or Point(0, 0)
  for f = 1, NUM_FRAMES do
    master:newCel(layer, f, img:clone(), pt)
  end
end

-- 3. 提取原始黑板粉笔图 (prop_chalkboard_d1) 并清理底图黑板面
local baseImg = rawImg:clone()
local d1Img = Image(BASE_W, BASE_H, ColorMode.RGB)
d1Img:clear(rgba(0, 0, 0, 0))

-- 黑板内芯范围（木框为暖棕 R > B，石板与粉笔字为冷蓝 B > R）
for y = 58, 226 do
  for x = 216, 386 do
    local px = rawImg:getPixel(x, y)
    local r, g, b = rgbaR(px), rgbaG(px), rgbaB(px)
    -- 提取粉笔线条到透明层 d1Img
    if b > r + 8 and b > 34 then
      local nr = clamp(math.floor(r * 1.12), 0, 255)
      local ng = clamp(math.floor(g * 1.12), 0, 255)
      local nb = clamp(math.floor(b * 1.14), 0, 255)
      d1Img:drawPixel(x, y, rgba(nr, ng, nb, 255))
    end
    -- 仅将冷蓝色粉笔笔迹（b > r + 4 且亮度高于石板底色）擦除为深蓝石板底色，完全不碰斜透视的棕色木框
    if b > r + 4 and b > 26 then
      local noise = ((x * 7 + y * 13) % 3) - 1
      local slateR = clamp(1 + noise, 0, 4)
      local slateG = clamp(7 + noise, 5, 10)
      local slateB = clamp(26 + noise, 23, 29)
      baseImg:drawPixel(x, y, rgba(slateR, slateG, slateB, 255))
    end
  end
end

-- 4. 像素画辅助绘图工具（用于在 d2, d3 上绘制同风格像素数学图）
local C_BRIGHT = rgba(154, 178, 222, 255)
local C_MAIN   = rgba(112, 134, 178, 255)
local C_MID    = rgba(78, 96, 134, 255)
local C_DIM    = rgba(52, 66, 98, 255)
local C_GOLD   = rgba(212, 178, 124, 255)

local function pset(img, x, y, col)
  if x >= 218 and x <= 384 and y >= 68 and y <= 224 then
    img:drawPixel(math.floor(x), math.floor(y), col)
  end
end

local function drawLine(img, x0, y0, x1, y1, col, dashed)
  x0, y0, x1, y1 = math.floor(x0), math.floor(y0), math.floor(x1), math.floor(y1)
  local dx = math.abs(x1 - x0)
  local sx = x0 < x1 and 1 or -1
  local dy = -math.abs(y1 - y0)
  local sy = y0 < y1 and 1 or -1
  local err = dx + dy
  local step = 0
  while true do
    if not dashed or (step % 4 < 2) then
      pset(img, x0, y0, col)
    end
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
    step = step + 1
  end
end

local function drawArrow(img, x0, y0, x1, y1, col, dashed)
  drawLine(img, x0, y0, x1, y1, col, dashed)
  local dx = x1 - x0
  local dy = y1 - y0
  local len = math.sqrt(dx * dx + dy * dy)
  if len < 1 then return end
  local ux, uy = dx / len, dy / len
  local px, py = -uy, ux
  for i = 1, 4 do
    pset(img, math.floor(x1 - ux * i + px * (i * 0.65)), math.floor(y1 - uy * i + py * (i * 0.65)), col)
    pset(img, math.floor(x1 - ux * i - px * (i * 0.65)), math.floor(y1 - uy * i - py * (i * 0.65)), col)
  end
end

local function drawEllipse(img, cx, cy, rx, ry, col, dashed)
  local steps = math.max(36, math.floor((rx + ry) * 3))
  for i = 0, steps - 1 do
    if not dashed or (i % 4 < 2) then
      local t = (i / steps) * math.pi * 2
      local x = math.floor(cx + math.cos(t) * rx + 0.5)
      local y = math.floor(cy + math.sin(t) * ry + 0.5)
      pset(img, x, y, col)
    end
  end
end

local function drawRect(img, x0, y0, x1, y1, col)
  drawLine(img, x0, y0, x1, y0, col, false)
  drawLine(img, x1, y0, x1, y1, col, false)
  drawLine(img, x1, y1, x0, y1, col, false)
  drawLine(img, x0, y1, x0, y0, col, false)
end

-- 迷你 5×7 像素数学符号与字母位图
local GLYPHS = {
  ["A"] = { "01110", "10001", "10001", "11111", "10001", "10001", "10001" },
  ["B"] = { "11110", "10001", "10001", "11110", "10001", "10001", "11110" },
  ["C"] = { "01111", "10000", "10000", "10000", "10000", "10000", "01111" },
  ["D"] = { "11110", "10001", "10001", "10001", "10001", "10001", "11110" },
  ["E"] = { "11111", "10000", "10000", "11110", "10000", "10000", "11111" },
  ["F"] = { "11111", "10000", "10000", "11110", "10000", "10000", "10000" },
  ["G"] = { "01111", "10000", "10000", "10111", "10001", "10001", "01110" },
  ["H"] = { "10001", "10001", "10001", "11111", "10001", "10001", "10001" },
  ["K"] = { "10001", "10010", "10100", "11000", "10100", "10010", "10001" },
  ["M"] = { "10001", "11011", "10101", "10101", "10001", "10001", "10001" },
  ["Q"] = { "01110", "10001", "10001", "10001", "10101", "10010", "01101" },
  ["X"] = { "10001", "10001", "01010", "00100", "01010", "10001", "10001" },
  ["Y"] = { "10001", "10001", "01010", "00100", "00100", "00100", "00100" },
  ["Z"] = { "11111", "00001", "00010", "00100", "01000", "10000", "11111" },
  ["0"] = { "01110", "10001", "10011", "10101", "11001", "10001", "01110" },
  ["1"] = { "00100", "01100", "00100", "00100", "00100", "00100", "01110" },
  ["2"] = { "01110", "10001", "00001", "00110", "01000", "10000", "11111" },
  ["+"] = { "00000", "00100", "00100", "11111", "00100", "00100", "00000" },
  ["="] = { "00000", "00000", "11111", "00000", "11111", "00000", "00000" },
}

local function drawGlyph(img, ch, x, y, col)
  local g = GLYPHS[ch]
  if not g then return end
  for row = 1, #g do
    local line = g[row]
    for c = 1, #line do
      if line:sub(c, c) == "1" then
        pset(img, x + c - 1, y + row - 1, col)
      end
    end
  end
end

local function drawText(img, text, x, y, col, spacing)
  local sp = spacing or 7
  for i = 1, #text do
    drawGlyph(img, text:sub(i, i), x + (i - 1) * sp, y, col)
  end
end

local function drawSparkle(img, cx, cy, col)
  pset(img, cx, cy, col)
  pset(img, cx - 1, cy, C_DIM)
  pset(img, cx + 1, cy, C_DIM)
  pset(img, cx, cy - 1, C_DIM)
  pset(img, cx, cy + 1, C_DIM)
end

-- 5. 绘制数学黑板状态 2 (prop_chalkboard_d2：同调代数、交换图与蛇引理)
local d2Img = Image(BASE_W, BASE_H, ColorMode.RGB)
d2Img:clear(rgba(0, 0, 0, 0))
do
  -- 左上：纤维积 / Pullback 交换方块 (X -> A, X -> B, A -> D, B -> D)
  drawGlyph(d2Img, "X", 226, 76, C_GOLD)
  drawGlyph(d2Img, "A", 268, 86, C_BRIGHT)
  drawGlyph(d2Img, "B", 242, 118, C_BRIGHT)
  drawGlyph(d2Img, "D", 284, 118, C_BRIGHT)

  -- 虚线泛性质态射 X --> A x_D B
  drawArrow(d2Img, 233, 81, 245, 92, C_GOLD, true)
  drawGlyph(d2Img, "C", 247, 92, C_BRIGHT)
  drawArrow(d2Img, 254, 95, 266, 91, C_MAIN, false)
  drawArrow(d2Img, 249, 101, 246, 115, C_MAIN, false)
  drawArrow(d2Img, 271, 95, 285, 115, C_MAIN, false)
  drawArrow(d2Img, 250, 121, 281, 121, C_MAIN, false)
  -- 外部弧线 X -> A 和 X -> B
  drawArrow(d2Img, 233, 78, 265, 86, C_MID, false)
  drawArrow(d2Img, 228, 85, 240, 116, C_MID, false)
  -- Pullback 直角记号
  drawLine(d2Img, 254, 100, 260, 100, C_DIM, false)
  drawLine(d2Img, 260, 100, 260, 105, C_DIM, false)

  -- 右上：蛇引理 (Snake Lemma) 双行正合列 + 蜿蜒连接同态 δ
  -- 上行: K -> A -> B -> C -> 0
  local yTop = 82
  local yBot = 116
  drawGlyph(d2Img, "K", 306, yTop, C_GOLD)
  drawArrow(d2Img, 313, yTop + 3, 323, yTop + 3, C_MAIN, false)
  drawGlyph(d2Img, "A", 326, yTop, C_BRIGHT)
  drawArrow(d2Img, 333, yTop + 3, 343, yTop + 3, C_MAIN, false)
  drawGlyph(d2Img, "B", 346, yTop, C_BRIGHT)
  drawArrow(d2Img, 353, yTop + 3, 363, yTop + 3, C_MAIN, false)
  drawGlyph(d2Img, "C", 366, yTop, C_BRIGHT)

  -- 下行: 0 -> A' -> B' -> C' -> Q
  drawGlyph(d2Img, "0", 306, yBot, C_MID)
  drawArrow(d2Img, 313, yBot + 3, 323, yBot + 3, C_MAIN, false)
  drawGlyph(d2Img, "E", 326, yBot, C_BRIGHT)
  drawArrow(d2Img, 333, yBot + 3, 343, yBot + 3, C_MAIN, false)
  drawGlyph(d2Img, "F", 346, yBot, C_BRIGHT)
  drawArrow(d2Img, 353, yBot + 3, 363, yBot + 3, C_MAIN, false)
  drawGlyph(d2Img, "Q", 366, yBot, C_GOLD)

  -- 竖向态射
  drawArrow(d2Img, 328, yTop + 9, 328, yBot - 2, C_MID, false)
  drawArrow(d2Img, 348, yTop + 9, 348, yBot - 2, C_MID, false)
  drawArrow(d2Img, 368, yTop + 9, 368, yBot - 2, C_MID, false)

  -- 蛇形连接同态 δ: K (308,82) 绕过中间连到 Q (372,116)
  drawLine(d2Img, 373, yTop + 3, 379, yTop + 3, C_GOLD, false)
  drawLine(d2Img, 379, yTop + 3, 379, 100, C_GOLD, false)
  drawLine(d2Img, 379, 100, 301, 100, C_GOLD, true)
  drawLine(d2Img, 301, 100, 301, yBot + 14, C_GOLD, false)
  drawArrow(d2Img, 301, yBot + 14, 364, yBot + 14, C_GOLD, false)

  -- 左下：3-单纯形 (Tetrahedral 3-Simplex Δ³) 与定向边
  local v0x, v0y = 256, 146
  local v1x, v1y = 228, 198
  local v2x, v2y = 274, 210
  local v3x, v3y = 292, 178
  drawLine(d2Img, v1x, v1y, v3x, v3y, C_DIM, true)
  drawArrow(d2Img, v0x, v0y, v1x, v1y, C_BRIGHT, false)
  drawArrow(d2Img, v0x, v0y, v2x, v2y, C_BRIGHT, false)
  drawArrow(d2Img, v0x, v0y, v3x, v3y, C_MAIN, false)
  drawArrow(d2Img, v1x, v1y, v2x, v2y, C_BRIGHT, false)
  drawArrow(d2Img, v2x, v2y, v3x, v3y, C_MAIN, false)
  drawGlyph(d2Img, "0", v0x - 2, v0y - 9, C_MID)
  drawGlyph(d2Img, "1", v1x - 7, v1y - 3, C_MID)
  drawGlyph(d2Img, "2", v2x - 2, v2y + 3, C_MID)

  -- 右下：伴随函子与自然变换双胞 (2-Category 2-cell: F => G)
  local c1x, c1y = 314, 176
  local c2x, c2y = 374, 176
  drawGlyph(d2Img, "C", c1x - 6, c1y - 3, C_BRIGHT)
  drawGlyph(d2Img, "D", c2x + 2, c2y - 3, C_BRIGHT)
  -- 上下弧线代表函子 F, G
  for x = c1x + 2, c2x - 2 do
    local t = (x - (c1x + 2)) / (c2x - c1x - 4)
    local arch = math.floor(math.sin(t * math.pi) * 18 + 0.5)
    pset(d2Img, x, c1y - 3 - arch, C_MAIN)
    pset(d2Img, x, c1y + 3 + arch, C_MAIN)
  end
  -- 箭头尖
  drawArrow(d2Img, c2x - 6, c2y - 9, c2x - 2, c2y - 4, C_MAIN, false)
  drawArrow(d2Img, c2x - 6, c2y + 9, c2x - 2, c2y + 4, C_MAIN, false)
  -- 中间竖向双线箭头 (2-morphism η: F => G)
  drawLine(d2Img, 342, c1y - 14, 342, c1y + 12, C_GOLD, false)
  drawLine(d2Img, 346, c1y - 14, 346, c1y + 12, C_GOLD, false)
  drawLine(d2Img, 339, c1y + 9, 344, c1y + 14, C_GOLD, false)
  drawLine(d2Img, 349, c1y + 9, 344, c1y + 14, C_GOLD, false)
  drawGlyph(d2Img, "F", 342, c1y - 25, C_BRIGHT)
  drawGlyph(d2Img, "G", 342, c1y + 19, C_BRIGHT)

  -- 点缀小星点保持与原黑板统一的手绘感
  drawSparkle(d2Img, 296, 146, C_MID)
  drawSparkle(d2Img, 310, 140, C_MID)
  drawSparkle(d2Img, 232, 140, C_MID)
end

-- 6. 绘制数学黑板状态 3 (prop_chalkboard_d3：代数拓扑环面、三叶结与椭圆谱曲线)
local d3Img = Image(BASE_W, BASE_H, ColorMode.RGB)
d3Img:clear(rgba(0, 0, 0, 0))
do
  -- 左上：亏格 g=1 环面 T² = S¹ × S¹ 及两条基本同调生成元循环 α, β
  local tcx, tcy = 262, 110
  drawEllipse(d3Img, tcx, tcy, 36, 22, C_MAIN, false)
  drawEllipse(d3Img, tcx, tcy, 36, 12, C_DIM, true)
  -- 环面中心孔洞
  for dx = -14, 14 do
    local yArc = math.floor((dx * dx) / 28)
    pset(d3Img, tcx + dx, tcy - 3 + yArc, C_BRIGHT)
  end
  for dx = -11, 11 do
    local yArc = math.floor((dx * dx) / 24)
    pset(d3Img, tcx + dx, tcy + 3 - yArc, C_MAIN)
  end
  -- 经圈 α (金色虚实椭圆) 与纬圈 β
  drawEllipse(d3Img, tcx, tcy + 1, 25, 13, C_GOLD, false)
  drawEllipse(d3Img, tcx - 22, tcy, 5, 11, C_GOLD, false)

  -- 右上：三叶结 (2,3)-Trefoil Knot
  local kcx, kcy = 346, 108
  local prevX, prevY = nil, nil
  local knotSteps = 160
  for i = 0, knotSteps do
    local t = (i / knotSteps) * math.pi * 2
    local r = 14 + 7 * math.cos(3 * t)
    local x = math.floor(kcx + r * math.cos(2 * t) + 0.5)
    local y = math.floor(kcy + r * math.sin(2 * t) + 0.5)
    -- 在三个下交叉点留出断口体现立体穿插
    local phase = (i % 53)
    if phase > 4 and phase < 49 then
      local col = (math.sin(3 * t) > 0) and C_BRIGHT or C_MAIN
      if prevX and math.abs(x - prevX) <= 3 and math.abs(y - prevY) <= 3 then
        drawLine(d3Img, prevX, prevY, x, y, col, false)
      else
        pset(d3Img, x, y, col)
      end
    end
    prevX, prevY = x, y
  end

  -- 左下：椭圆曲线实部相图 y² = x³ - x (左闭卵形线 + 右开口分支)
  local ecx, ecy = 258, 184
  -- 坐标轴
  drawArrow(d3Img, 224, ecy, 294, ecy, C_DIM, false)
  drawArrow(d3Img, ecx, 216, ecx, 152, C_DIM, false)
  -- 左卵形分支 (-1 <= u <= 0)
  drawEllipse(d3Img, ecx - 14, ecy, 9, 13, C_GOLD, false)
  -- 右侧开口三次曲线分支
  for dy = -24, 24 do
    local ny = dy / 14.0
    local nx = math.floor(6 + (ny * ny) * 6.5 + 0.5)
    pset(d3Img, ecx + nx, ecy + dy, C_BRIGHT)
    if math.abs(dy) < 20 then
      pset(d3Img, ecx + nx + 1, ecy + dy, C_MAIN)
    end
  end

  -- 右下：上同调群公式 H*(M, Z) 与黎曼面分支割线
  drawText(d3Img, "H+M=Z", 316, 158, C_BRIGHT, 8)
  -- 两条平行黎曼叶面与交叉分支割线 (Branch Cut)
  drawLine(d3Img, 314, 182, 366, 174, C_MAIN, false)
  drawLine(d3Img, 322, 194, 374, 186, C_MAIN, false)
  drawLine(d3Img, 314, 182, 322, 194, C_MAIN, false)
  drawLine(d3Img, 366, 174, 374, 186, C_MAIN, false)

  drawLine(d3Img, 314, 202, 366, 194, C_MID, false)
  drawLine(d3Img, 322, 214, 374, 206, C_MID, false)
  drawLine(d3Img, 314, 202, 322, 214, C_MID, false)
  drawLine(d3Img, 366, 194, 374, 206, C_MID, false)
  -- 连接上下叶的金色割线
  drawLine(d3Img, 336, 184, 352, 202, C_GOLD, false)
  drawLine(d3Img, 352, 182, 336, 204, C_GOLD, false)

  drawSparkle(d3Img, 304, 118, C_MID)
  drawSparkle(d3Img, 304, 168, C_MID)
  drawSparkle(d3Img, 232, 148, C_MID)
end

-- 7. 提取并强化黑板下沿粉笔槽与板擦触发件 (prop_chalk_tray)
-- 范围: x = 236..362, y = 234..248
local trayImg = Image(BASE_W, BASE_H, ColorMode.RGB)
trayImg:clear(rgba(0, 0, 0, 0))
do
  -- 复制原有木质粉笔托槽区域
  for y = 235, 247 do
    for x = 238, 358 do
      trayImg:drawPixel(x, y, rawImg:getPixel(x, y))
    end
  end
  -- 在托槽上精致绘制板擦与三支彩色粉笔（白、蓝、金），使其更容易看清和点击
  -- 左侧板擦 (x=243..256, y=239..245)
  for y = 240, 243 do
    for x = 243, 255 do
      trayImg:drawPixel(x, y, rgba(164, 134, 102, 255))
    end
  end
  for y = 244, 245 do
    for x = 243, 255 do
      trayImg:drawPixel(x, y, rgba(78, 86, 112, 255))
    end
  end
  -- 中间偏左：白色与天蓝粉笔段
  drawLine(trayImg, 274, 243, 283, 243, rgba(214, 222, 238, 255), false)
  drawLine(trayImg, 274, 244, 283, 244, rgba(146, 158, 184, 255), false)
  drawLine(trayImg, 292, 243, 300, 243, rgba(138, 178, 232, 255), false)
  drawLine(trayImg, 292, 244, 300, 244, rgba(94, 126, 176, 255), false)
  -- 右侧：金色粉笔段
  drawLine(trayImg, 336, 240, 347, 240, rgba(232, 196, 134, 255), false)
  drawLine(trayImg, 336, 241, 347, 241, rgba(172, 132, 82, 255), false)
end

-- 8. 构建三支可交互动态蜡烛 (4 帧跳动火苗 + 4 帧熄灭青烟，并在 baseImg 上清理静态火苗)
local CANDLE_SPECS = {
  {
    id = "column",
    -- 包围盒覆盖火苗与蜡烛台主体
    x0 = 162, x1 = 182,
    y0 = 104, y1 = 153,
    wickX = 175, wickY = 128,
    flameTop = 109, flameH = 18, flameW = 4.2,
  },
  {
    id = "desk",
    x0 = 334, x1 = 351,
    y0 = 286, y1 = 336,
    wickX = 342, wickY = 309,
    flameTop = 290, flameH = 18, flameW = 3.8,
  },
  {
    id = "bench",
    x0 = 741, x1 = 757,
    y0 = 296, y1 = 335,
    wickX = 749, wickY = 314,
    flameTop = 299, flameH = 14, flameW = 3.4,
  },
}

-- 在 baseImg 上自然抹除烛芯上方的静态火苗（径向羽化过渡，不留矩形痕迹）
local function cleanBaseCandleFlame(spec)
  local cy = (spec.flameTop + spec.wickY) * 0.5
  local rx = (spec.x1 - spec.x0) * 0.5 + 3
  local ry = (spec.wickY - spec.y0) * 0.5 + 3
  for y = spec.y0 - 2, spec.wickY do
    local leftSample = rawImg:getPixel(spec.x0 - 4, y)
    local rightSample = rawImg:getPixel(spec.x1 + 4, y)
    for x = spec.x0 - 2, spec.x1 + 2 do
      local orig = rawImg:getPixel(x, y)
      local orR, orG, orB = rgbaR(orig), rgbaG(orig), rgbaB(orig)
      local t = (x - (spec.x0 - 4)) / math.max(1, (spec.x1 - spec.x0 + 8))
      t = clamp(t, 0, 1)
      local bgR = math.floor((rgbaR(leftSample) * (1 - t) + rgbaR(rightSample) * t) * 0.76)
      local bgG = math.floor((rgbaG(leftSample) * (1 - t) + rgbaG(rightSample) * t) * 0.72)
      local bgB = math.floor((rgbaB(leftSample) * (1 - t) + rgbaB(rightSample) * t) * 0.78)
      local ndx = (x - spec.wickX) / rx
      local ndy = (y - cy) / ry
      local radial = math.sqrt(ndx * ndx + ndy * ndy)
      local blend = clamp(1.25 - radial, 0, 1)
      -- 越亮（属于火苗本体）的像素越完全替换为背景石墙色
      if orR > bgR + 25 then
        blend = math.max(blend, clamp((orR - bgR) / 95.0, 0, 1))
      end
      local nr = math.floor(orR * (1 - blend) + bgR * blend)
      local ng = math.floor(orG * (1 - blend) + bgG * blend)
      local nb = math.floor(orB * (1 - blend) + bgB * blend)
      baseImg:drawPixel(x, y, rgba(nr, ng, nb, 255))
    end
  end
  -- 仅压暗底图上与蜡烛柱身重合的像素，不碰两侧背景墙
  for y = spec.wickY + 1, spec.y1 do
    for x = spec.x0, spec.x1 do
      local px = rawImg:getPixel(x, y)
      local r, g, b = rgbaR(px), rgbaG(px), rgbaB(px)
      local dist = math.abs(x - spec.wickX)
      if (dist <= 5) or (r > 70 and g > 40) then
        baseImg:drawPixel(x, y, rgba(math.floor(r * 0.56), math.floor(g * 0.54), math.floor(b * 0.64), 255))
      end
    end
  end
end

-- 为单支蜡烛生成 4 帧 lit 图像和 4 帧 unlit 图像
local function buildCandleFrames(spec)
  local litFrames = {}
  local unlitFrames = {}

  -- 4 帧火苗摇曳参数: { tipDx, heightDelta, widthScale, sparkDy }
  local animParams = {
    { tipDx = 0.0,  dh = 0,  wScale = 1.00, spark = nil },
    { tipDx = 1.1,  dh = -1, wScale = 0.94, spark = -2 },
    { tipDx = 0.2,  dh = 1,  wScale = 1.08, spark = nil },
    { tipDx = -1.1, dh = 0,  wScale = 0.96, spark = -1 },
  }

  for f = 1, NUM_FRAMES do
    local lit = Image(BASE_W, BASE_H, ColorMode.RGB)
    lit:clear(rgba(0, 0, 0, 0))
    local unlit = Image(BASE_W, BASE_H, ColorMode.RGB)
    unlit:clear(rgba(0, 0, 0, 0))

    -- 1) 复制蜡烛柱身与烛托 (y = wickY..y1)
    for y = spec.wickY, spec.y1 do
      for x = spec.x0, spec.x1 do
        local px = rawImg:getPixel(x, y)
        local r, g, b = rgbaR(px), rgbaG(px), rgbaB(px)
        local dist = math.abs(x - spec.wickX)
        -- 只保留属于蜡烛柱身与烛托的像素，剔除两侧暗墙背景，确保 Alpha 轮廓紧贴蜡烛！
        local isCandleBody = (dist <= 5) or (r > 70 and g > 40)
        if isCandleBody then
          lit:drawPixel(x, y, px)
          -- unlit 状态：蜡烛柱身变冷变暗
          local ur = clamp(math.floor(r * 0.56), 0, 255)
          local ug = clamp(math.floor(g * 0.54), 0, 255)
          local ub = clamp(math.floor(b * 0.64 + 6), 0, 255)
          unlit:drawPixel(x, y, rgba(ur, ug, ub, 255))
        end
      end
    end

    -- 2) 绘制烛芯 (wick)
    lit:drawPixel(spec.wickX, spec.wickY, rgba(45, 25, 18, 255))
    lit:drawPixel(spec.wickX, spec.wickY - 1, rgba(120, 55, 25, 255))

    unlit:drawPixel(spec.wickX, spec.wickY, rgba(35, 24, 22, 255))
    -- 熄灭后的烛芯顶端保留一点明灭的暗红余烬
    local emberR = (f % 2 == 1) and 235 or 185
    local emberG = (f % 2 == 1) and 85 or 52
    unlit:drawPixel(spec.wickX, spec.wickY - 1, rgba(emberR, emberG, 24, 255))

    -- 3) 在 lit 帧上绘制像素火苗
    local p = animParams[f]
    local topY = spec.flameTop + p.dh
    local botY = spec.wickY - 1
    local h = math.max(6, botY - topY)
    for y = topY - 1, botY do
      -- u 从 0 (底部烛芯) 到 1 (火苗尖端)
      local u = 1.0 - ((y - topY) / h)
      u = clamp(u, 0.0, 1.1)
      -- 水滴形火苗宽度曲线
      local profile = math.sin((clamp(u, 0, 1) ^ 0.72) * math.pi)
      local halfW = spec.flameW * p.wScale * profile
      local centerShift = p.tipDx * (clamp(u, 0, 1) ^ 1.5)
      local cx = spec.wickX + centerShift

      for x = spec.x0, spec.x1 do
        local dx = math.abs(x - cx)
        if dx <= halfW + 1.2 then
          local norm = dx / math.max(0.6, halfW)
          if norm <= 0.42 and u < 0.78 then
            -- 炽白金黄内焰核心
            lit:drawPixel(x, y, rgba(255, 248, 214, 255))
          elseif norm <= 0.78 then
            -- 明亮琥珀黄中焰
            lit:drawPixel(x, y, rgba(255, 206, 112, 255))
          elseif norm <= 1.05 then
            -- 橘红暖外焰
            lit:drawPixel(x, y, rgba(236, 134, 62, 255))
          else
            -- 外缘半透明暖光晕像素
            lit:drawPixel(x, y, rgba(186, 88, 38, 170))
          end
        end
      end
    end
    -- 偶发跃起的一颗 1px 火星
    if p.spark then
      local sx = math.floor(spec.wickX + p.tipDx + 0.5)
      local sy = topY + p.spark
      lit:drawPixel(sx, sy, rgba(255, 214, 128, 230))
    end

    -- 4) 在 unlit 帧上绘制 4 帧袅袅上升的像素青烟
    for step = 1, 10 do
      local sy = spec.wickY - 2 - step
      local phase = (step + f * 1.6) * 0.75
      local sx = math.floor(spec.wickX + math.sin(phase) * 1.6 + 0.5)
      local alpha = clamp(150 - step * 11, 28, 150)
      unlit:drawPixel(sx, sy, rgba(148, 162, 192, alpha))
      if step % 3 == 0 then
        unlit:drawPixel(sx + 1, sy, rgba(118, 132, 164, math.floor(alpha * 0.6)))
      end
    end

    litFrames[f] = lit
    unlitFrames[f] = unlit
  end

  return litFrames, unlitFrames
end

local candleImages = {}
for _, spec in ipairs(CANDLE_SPECS) do
  cleanBaseCandleFlame(spec)
  local litFrames, unlitFrames = buildCandleFrames(spec)
  candleImages[spec.id] = { lit = litFrames, unlit = unlitFrames }
end

-- 9. 组装 study-master.aseprite 的图层树
local baseLayer = master.layers[1]
baseLayer.name = "00_room_base"
fillAllFrames(baseLayer, baseImg)

-- Group: 30_chalkboard
local chalkGroup = master:newGroup()
chalkGroup.name = "30_chalkboard"

local lD1 = master:newLayer()
lD1.name = "prop_chalkboard_d1"
lD1.parent = chalkGroup
fillAllFrames(lD1, d1Img)

local lD2 = master:newLayer()
lD2.name = "prop_chalkboard_d2"
lD2.parent = chalkGroup
lD2.isVisible = false -- 默认隐藏以免在编辑器里与 d1 叠在一起，导出脚本会自动导出全部状态
fillAllFrames(lD2, d2Img)

local lD3 = master:newLayer()
lD3.name = "prop_chalkboard_d3"
lD3.parent = chalkGroup
lD3.isVisible = false
fillAllFrames(lD3, d3Img)

local lTray = master:newLayer()
lTray.name = "prop_chalk_tray"
lTray.parent = chalkGroup
fillAllFrames(lTray, trayImg)

-- Group: 80_candles
local candleGroup = master:newGroup()
candleGroup.name = "80_candles"

for _, spec in ipairs(CANDLE_SPECS) do
  local imgs = candleImages[spec.id]

  local litLayer = master:newLayer()
  litLayer.name = "prop_candle_" .. spec.id .. "_lit"
  litLayer.parent = candleGroup
  for f = 1, NUM_FRAMES do
    master:newCel(litLayer, f, imgs.lit[f], Point(0, 0))
  end

  local unlitLayer = master:newLayer()
  unlitLayer.name = "prop_candle_" .. spec.id .. "_unlit"
  unlitLayer.parent = candleGroup
  unlitLayer.isVisible = false
  for f = 1, NUM_FRAMES do
    master:newCel(unlitLayer, f, imgs.unlit[f], Point(0, 0))
  end
end

-- Layer: 99_hotspot_mask (960×540 六大主栏目掩膜参考层，默认隐藏)
local maskLayer = master:newLayer()
maskLayer.name = "99_hotspot_mask"
maskLayer.isVisible = false
fillAllFrames(maskLayer, rawMaskImg)

-- 保存主工程
master:saveCopyAs("artwork/study/study-master.aseprite")
print("Saved artwork/study/study-master.aseprite (" .. BASE_W .. "x" .. BASE_H .. ", " .. NUM_FRAMES .. " frames)")
master:close()
