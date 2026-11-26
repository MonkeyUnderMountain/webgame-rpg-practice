-- scripts/export-study.lua
-- 从 artwork/study/study-master.aseprite (960×540) 自动裁剪并导出 2× (1920×1080) 资源，
-- 同时将六大主栏目与所有模块化零件在 960×540 基准网格下的精确坐标写入 src/study-scene.json。

local EXPORT_SCALE = 2
local rgba = app.pixelColor.rgba
local rgbaR = app.pixelColor.rgbaR
local rgbaG = app.pixelColor.rgbaG
local rgbaB = app.pixelColor.rgbaB
local rgbaA = app.pixelColor.rgbaA

local spr = app.open("artwork/study/study-master.aseprite")
app.activeSprite = spr
app.command.ChangePixelFormat{ format="rgb" }

local baseW = spr.width
local baseH = spr.height
local numFrames = #spr.frames
local frameDurationMs = math.floor((spr.frames[1].duration or 0.18) * 1000 + 0.5)

-- 递归查找图层
local function findLayer(layers, name)
  for _, layer in ipairs(layers) do
    if layer.name == name then
      return layer
    end
    if layer.isGroup then
      local found = findLayer(layer.layers, name)
      if found then return found end
    end
  end
  return nil
end

-- 获取某个图层在指定帧的整画布图像 (baseW × baseH)
local function getLayerFrameImage(layer, frameIndex)
  local out = Image(baseW, baseH, ColorMode.RGB)
  out:clear(rgba(0, 0, 0, 0))
  if not layer then return out end
  local cel = layer:cel(frameIndex)
  if not cel then return out end
  out:drawImage(cel.image, cel.position)
  return out
end

-- 计算一组图层在所有帧上的非透明像素联合包围盒 (Alpha > 0)
local function computeUnionBounds(layerNames)
  local minX, minY = baseW, baseH
  local maxX, maxY = -1, -1
  for _, name in ipairs(layerNames) do
    local layer = findLayer(spr.layers, name)
    if layer then
      for f = 1, numFrames do
        local cel = layer:cel(f)
        if cel then
          local img = cel.image
          local ox, oy = cel.position.x, cel.position.y
          for y = 0, img.height - 1 do
            for x = 0, img.width - 1 do
              if rgbaA(img:getPixel(x, y)) > 0 then
                local gx, gy = ox + x, oy + y
                if gx >= 0 and gx < baseW and gy >= 0 and gy < baseH then
                  if gx < minX then minX = gx end
                  if gx > maxX then maxX = gx end
                  if gy < minY then minY = gy end
                  if gy > maxY then maxY = gy end
                end
              end
            end
          end
        end
      end
    end
  end
  if maxX < minX or maxY < minY then
    return nil
  end
  return {
    x = minX,
    y = minY,
    width = maxX - minX + 1,
    height = maxY - minY + 1,
  }
end

-- 判断两个裁剪区域的像素是否完全一致（用于自动区分静态单帧与多帧动画）
local function regionsEqual(imgA, imgB, bounds)
  for y = bounds.y, bounds.y + bounds.height - 1 do
    for x = bounds.x, bounds.x + bounds.width - 1 do
      if imgA:getPixel(x, y) ~= imgB:getPixel(x, y) then
        return false
      end
    end
  end
  return true
end

-- Nearest-Neighbor 整数倍放大图像
local function scaleImageNearest(src, scale)
  if scale == 1 then return src:clone() end
  local dst = Image(src.width * scale, src.height * scale, ColorMode.RGB)
  dst:clear(rgba(0, 0, 0, 0))
  for y = 0, src.height - 1 do
    for x = 0, src.width - 1 do
      local px = src:getPixel(x, y)
      if rgbaA(px) > 0 then
        local dx0 = x * scale
        local dy0 = y * scale
        for sy = 0, scale - 1 do
          for sx = 0, scale - 1 do
            dst:drawPixel(dx0 + sx, dy0 + sy, px)
          end
        end
      end
    end
  end
  return dst
end

-- 导出一个图层（自动检测 1 帧或 N 帧横向精灵图）到指定 PNG 文件
local function exportTrimmedLayer(layerName, bounds, outPath, scale)
  local layer = findLayer(spr.layers, layerName)
  if not layer then
    error("Missing layer in study-master.aseprite: " .. layerName)
  end

  local frameImgs = {}
  local isAnimated = false
  for f = 1, numFrames do
    frameImgs[f] = getLayerFrameImage(layer, f)
    if f > 1 and not regionsEqual(frameImgs[1], frameImgs[f], bounds) then
      isAnimated = true
    end
  end

  local exportFrames = isAnimated and numFrames or 1
  local sheet1x = Image(bounds.width * exportFrames, bounds.height, ColorMode.RGB)
  sheet1x:clear(rgba(0, 0, 0, 0))

  for f = 1, exportFrames do
    local src = frameImgs[f]
    local offsetX = (f - 1) * bounds.width
    for y = 0, bounds.height - 1 do
      for x = 0, bounds.width - 1 do
        local px = src:getPixel(bounds.x + x, bounds.y + y)
        sheet1x:drawPixel(offsetX + x, y, px)
      end
    end
  end

  local finalSheet = scaleImageNearest(sheet1x, scale)
  finalSheet:saveAs(outPath)
  return exportFrames
end

-- 1. 导出 00_room_base -> public/art/study/mage/study.png (2×: 1920×1080)
local baseLayer = findLayer(spr.layers, "00_room_base")
local baseImg1x = getLayerFrameImage(baseLayer, 1)
local baseImg2x = scaleImageNearest(baseImg1x, EXPORT_SCALE)
baseImg2x:saveAs("public/art/study/mage/study.png")
print(string.format("Exported study.png (%dx%d)", baseImg2x.width, baseImg2x.height))

-- 2. 导出 99_hotspot_mask -> public/art/study/mage/hotspots.png (1×: 960×540 基准网格)
--    并自动扫描六大主栏目的 960×540 包围盒，不再依赖任何手写多边形 JSON。
local SECTION_SPECS = {
  { id = "news",     label = "News",         key = 1, priority = 2, labelBelow = true,  outline = "all",     color = { 58, 215, 255 } },
  { id = "research", label = "Research",     key = 2, priority = 3, labelBelow = true,  outline = "all",     color = { 89, 226, 138 } },
  { id = "profile",  label = "About",        key = 3, priority = 6, labelBelow = false, outline = "all",     color = { 255, 210, 122 } },
  { id = "notes",    label = "Notes",        key = 4, priority = 4, labelBelow = true,  outline = "largest", color = { 255, 154, 120 } },
  { id = "quests",   label = "Side Quests",  key = 5, priority = 5, labelBelow = false, outline = "all",     color = { 214, 140, 255 } },
  { id = "door",     label = "Look outside", key = 6, priority = 1, labelBelow = true,  outline = "all",     color = { 255, 122, 168 } },
}

local exportedSections = {}
local maskLayer = findLayer(spr.layers, "99_hotspot_mask")
if maskLayer then
  local maskImg1x = getLayerFrameImage(maskLayer, 1)
  maskImg1x:saveAs("public/art/study/mage/hotspots.png")
  print(string.format("Exported hotspots.png (%dx%d)", maskImg1x.width, maskImg1x.height))

  -- 为每个主栏目计算在 960×540 掩膜中的精确像素包围盒
  local boundsByKey = {}
  for _, sec in ipairs(SECTION_SPECS) do
    boundsByKey[sec.key] = { minX = baseW, minY = baseH, maxX = -1, maxY = -1 }
  end

  for y = 0, baseH - 1 do
    for x = 0, baseW - 1 do
      local px = maskImg1x:getPixel(x, y)
      local r, g, b = rgbaR(px), rgbaG(px), rgbaB(px)
      for _, sec in ipairs(SECTION_SPECS) do
        local c = sec.color
        if r == c[1] and g == c[2] and b == c[3] then
          local bd = boundsByKey[sec.key]
          if x < bd.minX then bd.minX = x end
          if x > bd.maxX then bd.maxX = x end
          if y < bd.minY then bd.minY = y end
          if y > bd.maxY then bd.maxY = y end
          break
        end
      end
    end
  end

  for _, sec in ipairs(SECTION_SPECS) do
    local bd = boundsByKey[sec.key]
    table.insert(exportedSections, {
      id = sec.id,
      label = sec.label,
      key = sec.key,
      color = sec.color,
      x = bd.minX,
      y = bd.minY,
      width = math.max(1, bd.maxX - bd.minX + 1),
      height = math.max(1, bd.maxY - bd.minY + 1),
      priority = sec.priority,
      labelBelow = sec.labelBelow,
      outline = sec.outline,
    })
  end
end

-- 3. 定义场景零件清单与状态映射，并自动计算裁剪包围盒 + 导出 PNG
local PROP_SPECS = {
  {
    id = "chalkboard-diagram",
    label = "Chalkboard Diagram",
    zIndex = 2,
    interactive = false,
    defaultState = "diagram_1",
    states = {
      { id = "diagram_1", layer = "prop_chalkboard_d1", file = "chalkboard-d1.png", caption = "I · Projective Geometry" },
      { id = "diagram_2", layer = "prop_chalkboard_d2", file = "chalkboard-d2.png", caption = "II · Snake Lemma & Pullback" },
      { id = "diagram_3", layer = "prop_chalkboard_d3", file = "chalkboard-d3.png", caption = "III · Torus & Trefoil Knot" },
    },
  },
  {
    id = "chalk-tray",
    label = "Chalk · Redraw Board",
    zIndex = 4,
    interactive = true,
    priority = 12,
    labelBelow = true,
    outline = "all",
    action = {
      type = "cycle-target",
      targetProp = "chalkboard-diagram",
      storageKey = "study:chalkboard-diagram",
    },
    defaultState = "default",
    states = {
      { id = "default", layer = "prop_chalk_tray", file = "chalk-tray.png" },
    },
  },
  {
    id = "candle-column",
    label = "Pillar Candle",
    zIndex = 3,
    interactive = true,
    priority = 13,
    labelBelow = true,
    outline = "all",
    action = {
      type = "toggle-state",
      fxSelector = ".fx-candle-column",
      storageKey = "study:candle-column",
    },
    defaultState = "lit",
    states = {
      { id = "lit",   layer = "prop_candle_column_lit",   file = "candle-column-lit.png",   fxActive = true },
      { id = "unlit", layer = "prop_candle_column_unlit", file = "candle-column-unlit.png", fxActive = false },
    },
  },
  {
    id = "candle-desk",
    label = "Desk Candle",
    zIndex = 3,
    interactive = true,
    priority = 14,
    labelBelow = false,
    outline = "all",
    action = {
      type = "toggle-state",
      fxSelector = ".fx-candle-desk",
      storageKey = "study:candle-desk",
    },
    defaultState = "lit",
    states = {
      { id = "lit",   layer = "prop_candle_desk_lit",   file = "candle-desk-lit.png",   fxActive = true },
      { id = "unlit", layer = "prop_candle_desk_unlit", file = "candle-desk-unlit.png", fxActive = false },
    },
  },
  {
    id = "candle-bench",
    label = "Window Candle",
    zIndex = 3,
    interactive = true,
    priority = 15,
    labelBelow = false,
    outline = "all",
    action = {
      type = "toggle-state",
      fxSelector = ".fx-candle-bench",
      storageKey = "study:candle-bench",
    },
    defaultState = "lit",
    states = {
      { id = "lit",   layer = "prop_candle_bench_lit",   file = "candle-bench-lit.png",   fxActive = true },
      { id = "unlit", layer = "prop_candle_bench_unlit", file = "candle-bench-unlit.png", fxActive = false },
    },
  },
}

-- 记录已知图层名，便于自动发现用户在 Aseprite 中新增的其他 prop_* 图层
local knownLayers = {
  ["00_room_base"] = true,
  ["99_hotspot_mask"] = true,
}
for _, p in ipairs(PROP_SPECS) do
  for _, st in ipairs(p.states) do
    knownLayers[st.layer] = true
  end
end

-- 自动扫描用户未来在 study-master.aseprite 中新增的独立 prop_<id> 图层
local function discoverCustomPropLayers(layers)
  for _, layer in ipairs(layers) do
    if layer.isGroup then
      discoverCustomPropLayers(layer.layers)
    elseif not knownLayers[layer.name] and layer.name:sub(1, 5) == "prop_" then
      local rawId = layer.name:sub(6):gsub("_", "-")
      knownLayers[layer.name] = true
      table.insert(PROP_SPECS, {
        id = rawId,
        label = rawId,
        zIndex = 2,
        interactive = false,
        defaultState = "default",
        states = {
          { id = "default", layer = layer.name, file = rawId .. ".png" },
        },
      })
    end
  end
end
discoverCustomPropLayers(spr.layers)

local exportedProps = {}

for _, prop in ipairs(PROP_SPECS) do
  local layerNames = {}
  for _, st in ipairs(prop.states) do
    table.insert(layerNames, st.layer)
  end
  local bounds = computeUnionBounds(layerNames)
  if bounds then
    local statesMeta = {}
    for _, st in ipairs(prop.states) do
      local relFile = "props/" .. st.file
      local outPath = "public/art/study/mage/" .. relFile
      local frames = exportTrimmedLayer(st.layer, bounds, outPath, EXPORT_SCALE)
      print(string.format("Exported %s (%dx%d @ %dx, %d frame(s))", relFile, bounds.width, bounds.height, EXPORT_SCALE, frames))
      table.insert(statesMeta, {
        id = st.id,
        src = relFile,
        frames = frames,
        frameDurationMs = frameDurationMs,
        fxActive = st.fxActive,
        caption = st.caption,
      })
    end
    table.insert(exportedProps, {
      id = prop.id,
      label = prop.label,
      x = bounds.x,
      y = bounds.y,
      width = bounds.width,
      height = bounds.height,
      zIndex = prop.zIndex,
      interactive = prop.interactive,
      priority = prop.priority,
      labelBelow = prop.labelBelow,
      outline = prop.outline,
      action = prop.action,
      defaultState = prop.defaultState,
      states = statesMeta,
    })
  end
end

-- 4. 序列化为格式化的 JSON 写入 src/study-scene.json
local function toJson(val, indent)
  indent = indent or 0
  local pad = string.rep("  ", indent)
  local nextPad = string.rep("  ", indent + 1)
  local t = type(val)
  if t == "nil" then
    return "null"
  elseif t == "boolean" or t == "number" then
    return tostring(val)
  elseif t == "string" then
    return string.format("%q", val)
  elseif t == "table" then
    local isArray = (#val > 0)
    if isArray then
      -- 紧凑输出 RGB 颜色三元组 [r, g, b]
      if #val == 3 and type(val[1]) == "number" then
        return string.format("[%d, %d, %d]", val[1], val[2], val[3])
      end
      local items = {}
      for i = 1, #val do
        table.insert(items, nextPad .. toJson(val[i], indent + 1))
      end
      return "[\n" .. table.concat(items, ",\n") .. "\n" .. pad .. "]"
    else
      local keyOrder = {
        "baseWidth", "baseHeight", "exportScale", "exportWidth", "exportHeight",
        "background", "hotspotMask", "sections", "props",
        "id", "label", "key", "color", "x", "y", "width", "height", "zIndex",
        "interactive", "priority", "labelBelow", "outline",
        "action", "type", "targetProp", "fxSelector", "storageKey",
        "defaultState", "states", "src", "frames", "frameDurationMs", "fxActive", "caption",
      }
      local seen = {}
      local keys = {}
      for _, k in ipairs(keyOrder) do
        if val[k] ~= nil then
          table.insert(keys, k)
          seen[k] = true
        end
      end
      for k, v in pairs(val) do
        if not seen[k] and v ~= nil then
          table.insert(keys, k)
        end
      end
      local pairsList = {}
      for _, k in ipairs(keys) do
        table.insert(pairsList, nextPad .. string.format("%q", k) .. ": " .. toJson(val[k], indent + 1))
      end
      return "{\n" .. table.concat(pairsList, ",\n") .. "\n" .. pad .. "}"
    end
  end
  return "null"
end

local manifest = {
  baseWidth = baseW,
  baseHeight = baseH,
  exportScale = EXPORT_SCALE,
  exportWidth = baseW * EXPORT_SCALE,
  exportHeight = baseH * EXPORT_SCALE,
  background = "study.png",
  hotspotMask = "hotspots.png",
  sections = exportedSections,
  props = exportedProps,
}

local f = io.open("src/study-scene.json", "w")
f:write(toJson(manifest, 0) .. "\n")
f:close()
print("Generated src/study-scene.json (" .. #exportedSections .. " sections, " .. #exportedProps .. " modular props).")

spr:close()
