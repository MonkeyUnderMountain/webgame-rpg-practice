-- scripts/pave-floor.lua
-- 从 artwork/study/room/tiles/ 下的 1× 源素材：
--   - wall-tile.png      (无缝石砖墙循环块，当前 213×104)
--   - plinth-stones.png  (凿石踢脚条石，当前 213×10)
--   - floor-pavers.png   (8 块 32×32 世界 UV 石砖纹理，256×32)
-- 按同一组一点透视相机参数（vx=320, vy=60）无缝渲染：
--   1. artwork/study/room/room-base.png              (640×360 核心书房底图)
--   2. artwork/study/room/tiles/side-left.png        (320×360 左侧连续透视延展带，x = -320..-1)
--   3. artwork/study/room/tiles/side-right.png       (320×360 右侧连续透视延展带，x = 640..959)
--   4. artwork/study/room/tiles/floor-bottom-tile.png (640×420 下方连续透视前景地板，y = 360..779)

local rgba  = app.pixelColor.rgba
local rgbaR = app.pixelColor.rgbaR
local rgbaG = app.pixelColor.rgbaG
local rgbaB = app.pixelColor.rgbaB

local roomDir = "artwork/study/room/"
local tileDir = roomDir .. "tiles/"

-- 房间 16 色石材调色板：0–7 冷灰蓝墙/踢脚，8–15 暖灰岩水平地砖
local WALL_PAL = {
  rgba(13, 17, 27, 255),    -- #0d111b
  rgba(24, 30, 41, 255),    -- #181e29
  rgba(37, 45, 56, 255),    -- #252d38
  rgba(51, 59, 71, 255),    -- #333b47
  rgba(66, 74, 84, 255),    -- #424a54
  rgba(83, 91, 99, 255),    -- #535b63
  rgba(105, 112, 118, 255), -- #697076
  rgba(131, 135, 129, 255), -- #838781
}

local FLOOR_PAL = {
  rgba(24, 27, 34, 255),    -- [1] #181b22 1px 凹陷砖缝
  rgba(42, 44, 50, 255),    -- [2] #2a2c32 墙脚深阴影
  rgba(58, 59, 63, 255),    -- [3] #3a3b3f 远排暗石
  rgba(72, 72, 74, 255),    -- [4] #48484a 中暗灰岩
  rgba(86, 84, 84, 255),    -- [5] #565454 中灰岩
  rgba(100, 97, 94, 255),   -- [6] #64615e 受光水平石面
  rgba(114, 109, 104, 255), -- [7] #726d68 浅灰岩 / 细微受光边
  rgba(128, 122, 114, 255), -- [8] #807a72 亮边点缀
}

-- 一点透视相机参数（与书桌透视斜角一致）
local VX          = 320.0         -- 水平灭点（书房中轴）
local VY          = 60.0          -- 垂直灭点（控制两侧砖缝发散角度）
local Y_WALL      = 302           -- 墙脚落地面线（家具整体下移 +24px 后）
local FX          = 242.0 / 36.0  -- 1.0 世界宽度在 y=302 处对应 36px
local FZ          = 1520.0        -- 深度投影常数 Z(y) = FZ / (y - VY)
local ROW_PITCH_Z = 0.215         -- 统一世界砖深
local Z_AT_WALL   = FZ / (Y_WALL - VY)

local function loadRgbImage(path)
  local spr = app.open(path)
  assert(spr, "Could not open tile source: " .. path)
  app.activeSprite = spr
  app.command.ChangePixelFormat{ format="rgb" }
  local out = Image(spr.width, spr.height, ColorMode.RGB)
  out:clear(rgba(0, 0, 0, 0))
  if spr.cels[1] then
    out:drawImage(spr.cels[1].image, spr.cels[1].position)
  end
  spr:close()
  return out
end

local function hash2(x, y, s)
  local h = (x * 73856093 + y * 19349663 + s * 83492791) % 2147483647
  if h < 0 then h = h + 2147483647 end
  h = (h * 48271) % 2147483647
  return h
end

local function clamp(v, lo, hi)
  if v < lo then return lo end
  if v > hi then return hi end
  return v
end

local function nearestFloorIndex(px)
  local r, g, b = rgbaR(px), rgbaG(px), rgbaB(px)
  local best, bestDist = 6, 999999
  for i = 1, #FLOOR_PAL do
    local p = FLOOR_PAL[i]
    local d = math.abs(r - rgbaR(p)) + math.abs(g - rgbaG(p)) + math.abs(b - rgbaB(p))
    if d < bestDist then
      bestDist = d
      best = i
    end
  end
  return best
end

-- 读取 1× 源 Tile
local wallImg   = loadRgbImage(tileDir .. "wall-tile.png")
local plinthImg = loadRgbImage(tileDir .. "plinth-stones.png")
local paverImg  = loadRgbImage(tileDir .. "floor-pavers.png")

local wallW, wallH     = wallImg.width, wallImg.height
local plinthW, plinthH = plinthImg.width, plinthImg.height
local yPlinthTop       = Y_WALL - plinthH

local texH     = paverImg.height
local texW     = texH
local texCount = math.max(1, math.floor(paverImg.width / texW))

-- 将 8 块石砖 UV 纹理预量化到 FLOOR_PAL 索引（1..8），便于按深度和砖块做整数色阶明暗偏移
local texIdx = {}
for y = 0, texH - 1 do
  local row = {}
  for x = 0, texCount * texW - 1 do
    row[x] = nearestFloorIndex(paverImg:getPixel(x, y))
  end
  texIdx[y] = row
end

local function getRowF(wy)
  local dy = wy - VY
  local z = FZ / dy
  return (Z_AT_WALL - z) / ROW_PITCH_Z
end

local function renderRegion(xStart, yStart, w, h)
  local img = Image(w, h, ColorMode.RGB)
  img:clear(rgba(13, 17, 27, 255))

  for ly = 0, h - 1 do
    local wy = yStart + ly
    if wy < yPlinthTop then
      -- 1) 石砖墙：无缝循环 wall-tile.png，临近踢脚上方 4px 做轻微阴影压暗
      local sy = wy % wallH
      local mul = (wy >= yPlinthTop - 4) and (0.86 + (yPlinthTop - 1 - wy) * 0.03) or 1.0
      for lx = 0, w - 1 do
        local mx = (xStart + lx) % wallW
        local px = wallImg:getPixel(mx, sy)
        if mul < 1.0 then
          px = rgba(
            math.floor(rgbaR(px) * mul),
            math.floor(rgbaG(px) * mul),
            math.floor(rgbaB(px) * mul),
            255
          )
        end
        img:drawPixel(lx, ly, px)
      end
    elseif wy < Y_WALL then
      -- 2) 凿石踢脚条石：无缝循环 plinth-stones.png
      local py = wy - yPlinthTop
      for lx = 0, w - 1 do
        local mx = (xStart + lx) % plinthW
        img:drawPixel(lx, ly, plinthImg:getPixel(mx, py))
      end
    else
      -- 3) 一点透视错缝石砖地面：
      --    用离散行/列索引跳变判定砖缝，保证每条水平与斜向砖缝严格为 1 逻辑像素宽。
      local rowF       = getRowF(wy)
      local rowIdx     = math.floor(rowF)
      local rowFrac    = rowF - rowIdx
      local prevRowIdx = (wy <= Y_WALL) and -1 or math.floor(getRowF(wy - 1))
      local prev2Idx   = (wy <= Y_WALL + 1) and -1 or math.floor(getRowF(wy - 2))
      local nextRowIdx = math.floor(getRowF(wy + 1))

      local isHorizGroove = (rowIdx ~= prevRowIdx)
      local isTopLip      = (not isHorizGroove) and (prevRowIdx ~= prev2Idx)
      local isBotLip      = (not isHorizGroove) and (nextRowIdx ~= rowIdx)

      local dy       = wy - VY
      local stagger  = (rowIdx % 2 == 1) and 0.5 or 0.0
      local v        = clamp(math.floor(rowFrac * texH), 0, texH - 1)
      local texRow   = texIdx[v]
      local fromWall = wy - Y_WALL
      local ao       = (fromWall < 7) and -2 or ((fromWall < 18) and -1 or 0)

      local prevColIdx = math.floor((((xStart - 1) - VX) / dy) * FX + stagger)

      for lx = 0, w - 1 do
        local wx = xStart + lx
        local xWorld = ((wx - VX) / dy) * FX + stagger
        local colIdx = math.floor(xWorld)
        local isVertGroove = (colIdx ~= prevColIdx)
        prevColIdx = colIdx

        if isHorizGroove or isVertGroove then
          img:drawPixel(lx, ly, FLOOR_PAL[1])
        else
          local colFrac = xWorld - colIdx
          local tile = hash2(colIdx + 500, rowIdx + 500, 19) % texCount
          local u = clamp(math.floor(colFrac * texW), 0, texW - 1)
          local idx = texRow[tile * texW + u]

          -- 邻砖微色差（-1 / 0 / +1）+ 墙脚 AO + 砖缝边缘 1px 细微受光/暗沿
          local toneDelta = (hash2(colIdx + 1000, rowIdx + 1000, 31) % 3) - 1
          idx = idx + toneDelta + ao
          if isTopLip then
            idx = idx + 1
          elseif isBotLip then
            idx = idx - 1
          end

          img:drawPixel(lx, ly, FLOOR_PAL[clamp(idx, 2, #FLOOR_PAL)])
        end
      end
    end
  end

  return img
end

local function buildRoomPalette()
  local pal = Palette(#WALL_PAL + #FLOOR_PAL)
  for i = 1, #WALL_PAL do pal:setColor(i - 1, WALL_PAL[i]) end
  for i = 1, #FLOOR_PAL do pal:setColor(#WALL_PAL + i - 1, FLOOR_PAL[i]) end
  return pal
end

local function saveWithPalette(img, path)
  local spr = Sprite(img.width, img.height, ColorMode.RGB)
  spr:setPalette(buildRoomPalette())
  spr:newCel(spr.layers[1], 1, img, Point(0, 0))
  spr:saveCopyAs(path)
  spr:close()
end

-- 生成核心 640×360 底图与三张连续透视延展图
saveWithPalette(renderRegion(0,    0,   640, 360), roomDir .. "room-base.png")
saveWithPalette(renderRegion(-320, 0,   320, 360), tileDir .. "side-left.png")
saveWithPalette(renderRegion(640,  0,   320, 360), tileDir .. "side-right.png")
saveWithPalette(renderRegion(0,    360, 640, 420), tileDir .. "floor-bottom-tile.png")

print("[study] Repaved room-base.png and continuous perspective extension tiles.")
