-- scripts/export-study.lua
-- 从书房 Aseprite 主工程按 3× 导出资源，并将 640×360 原画布坐标写入场景清单。

local rgba = app.pixelColor.rgba
local rgbaR = app.pixelColor.rgbaR
local rgbaG = app.pixelColor.rgbaG
local rgbaB = app.pixelColor.rgbaB
local rgbaA = app.pixelColor.rgbaA

local roomId = "study"

local SECTION_SPECS = {
  { id = "news",     label = "News",         key = 1, priority = 2, labelBelow = false, outline = "all",     color = { 58, 215, 255 } },
  { id = "research", label = "Research",     key = 2, priority = 3, labelBelow = false, outline = "all",     color = { 89, 226, 138 } },
  { id = "profile",  label = "About",        key = 3, priority = 6, labelBelow = false, outline = "all",     color = { 255, 210, 122 } },
  { id = "notes",    label = "Notes",        key = 4, priority = 4, labelBelow = false, outline = "largest", color = { 255, 154, 120 } },
  { id = "quests",   label = "Side Quests",  key = 5, priority = 5, labelBelow = false, outline = "all",     color = { 214, 140, 255 } },
  { id = "door",     label = "Look outside", key = 6, priority = 1, labelBelow = false, outline = "all",     color = { 255, 122, 168 } },
}

local room = {
  exportScale = 3,
  masterPath = "artwork/study/room/study-master.aseprite",
  outDir = "public/art/study/",
  artBase = "art/study/",
  manifestPath = "src/study-scene.json",
  props = {
    {
      id = "floor-shade",
      label = "Floor Shade",
      zIndex = 0,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_floor_shade", file = "floor-shade.png" },
      },
    },
    {
      id = "wall-lamp-glow",
      label = "Lantern Glow",
      zIndex = 0,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_wall_lamp_glow", file = "wall-lamp-glow.png" },
      },
    },
    {
      id = "window-light",
      label = "Window Light",
      zIndex = 0,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_window_light", file = "window-light.png" },
      },
    },
    {
      id = "window-view",
      label = "Window View",
      zIndex = 0,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_window_view", file = "window-view.png" },
      },
    },
    {
      id = "window-frame",
      label = "Arched Window",
      zIndex = 1,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_window_frame", file = "window-frame.png" },
      },
    },
    {
      id = "door",
      label = "Door",
      zIndex = 2,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_door", file = "door.png" },
      },
    },
    {
      id = "chalkboard-frame",
      label = "Chalkboard Frame",
      zIndex = 2,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_chalkboard_frame", file = "chalkboard-frame.png" },
      },
    },
    {
      id = "desk",
      label = "Desk",
      zIndex = 2,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_desk", file = "desk.png" },
      },
    },
    {
      id = "computer",
      label = "Computer",
      zIndex = 3,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_computer", file = "computer.png" },
      },
    },
    {
      id = "book",
      label = "Open Book",
      zIndex = 3,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_book", file = "book.png" },
      },
    },
    {
      id = "desk-chair",
      label = "Desk Chair",
      zIndex = 4,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_desk_chair", file = "desk-chair.png" },
      },
    },
    {
      id = "bookcase",
      label = "Bookcase",
      zIndex = 2,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_bookcase", file = "bookcase.png" },
      },
    },
    {
      id = "chalkboard-diagram",
      label = "Chalkboard Diagram",
      zIndex = 3,
      interactive = false,
      defaultState = "diagram_1",
      states = {
        { id = "diagram_1", layer = "prop_chalkboard_d1", file = "chalkboard-d1.png" },
      },
    },
    {
      id = "wall-lamp",
      label = "Wall Lantern",
      zIndex = 3,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_wall_lamp", file = "wall-lamp.png", durationMs = 240 },
      },
    },
    {
      id = "monitor-pulse",
      label = "Monitor Pulse",
      zIndex = 4,
      interactive = false,
      defaultState = "default",
      states = {
        { id = "default", layer = "prop_monitor_pulse", file = "monitor-pulse.png", durationMs = 900 },
      },
    },
  },
}

local spr = app.open(room.masterPath)
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
    error("Missing layer in " .. room.masterPath .. ": " .. layerName)
  end

  local frameImgs = {}
  local celCount = #layer.cels
  local isAnimated = false

  if celCount <= 1 then
    -- 若图层仅有一个 cel（如 continuous 静态层或仅画在第 1 帧的新零件），按 1 帧静态图导出，避免闪烁消失
    local singleCel = layer.cels[1]
    if singleCel then
      frameImgs[1] = getLayerFrameImage(layer, singleCel.frameNumber)
    else
      frameImgs[1] = getLayerFrameImage(layer, 1)
    end
  else
    for f = 1, numFrames do
      frameImgs[f] = getLayerFrameImage(layer, f)
      if f > 1 and not regionsEqual(frameImgs[1], frameImgs[f], bounds) then
        isAnimated = true
      end
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

-- 1. 导出 00_room_base -> <outDir>study.png (1920×1080)
local baseLayer = findLayer(spr.layers, "00_room_base")
local baseImg1x = getLayerFrameImage(baseLayer, 1)
local background = scaleImageNearest(baseImg1x, room.exportScale)
background:saveAs(room.outDir .. "study.png")
print(string.format("[%s] Exported study.png (%dx%d)", roomId, background.width, background.height))

-- 2. 导出 99_hotspot_mask -> <outDir>hotspots.png (1×)
--    只写入实际在掩膜层中有像素的栏目，尚未分配对象的栏目不会产生虚假坐标。
local exportedSections = {}
local maskLayer = findLayer(spr.layers, "99_hotspot_mask")
local maskImg1x = getLayerFrameImage(maskLayer, 1)
maskImg1x:saveAs(room.outDir .. "hotspots.png")
print(string.format("[%s] Exported hotspots.png (%dx%d)", roomId, maskImg1x.width, maskImg1x.height))

if maskLayer then
  local boundsByKey = {}
  for _, sec in ipairs(SECTION_SPECS) do
    boundsByKey[sec.key] = { minX = baseW, minY = baseH, maxX = -1, maxY = -1 }
  end

  for y = 0, baseH - 1 do
    for x = 0, baseW - 1 do
      local px = maskImg1x:getPixel(x, y)
      if rgbaA(px) > 0 then
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
  end

  for _, sec in ipairs(SECTION_SPECS) do
    local bd = boundsByKey[sec.key]
    if bd.maxX >= bd.minX and bd.maxY >= bd.minY then
      table.insert(exportedSections, {
        id = sec.id,
        label = sec.label,
        key = sec.key,
        color = sec.color,
        x = bd.minX,
        y = bd.minY,
        width = bd.maxX - bd.minX + 1,
        height = bd.maxY - bd.minY + 1,
        priority = sec.priority,
        labelBelow = sec.labelBelow,
        outline = sec.outline,
      })
    end
  end
end

-- 3. 导出场景零件（只导出已绘制了非透明像素的图层）
local PROP_SPECS = room.props
local knownLayers = {
  ["00_room_base"] = true,
  ["99_hotspot_mask"] = true,
}
for _, p in ipairs(PROP_SPECS) do
  for _, st in ipairs(p.states) do
    knownLayers[st.layer] = true
  end
end

-- Visible paper layers are authored by title; export-only IDs keep arbitrary
-- titles (including duplicates) out of file paths and layer-name lookups.
local function collectNoticePapers(group)
  if not group.isVisible then return end
  for index, layer in ipairs(group.layers) do
    local first = not layer.isGroup and layer:cel(1)
    if layer.isVisible and first then
      local id = "notice-paper-" .. index
      local title, text = layer.name, layer.data
      layer.name = "_export_" .. id
      -- Papers are stationary. Moving a paper on frame 1 sets its web position.
      for frame = numFrames, 2, -1 do
        local cel = layer:cel(frame)
        if cel then spr:deleteCel(cel) end
      end
      local readable = text ~= "" and text ~= nil
      table.insert(PROP_SPECS, {
        id = id, label = title, zIndex = 4, priority = 15, interactive = readable,
        outline = "largest", defaultState = "default",
        action = readable and { type = "read-note", text = text } or nil,
        states = { { id = "default", layer = layer.name, file = id .. ".png" } },
      })
    end
  end
end

-- 自动扫描用户在 Aseprite 中新增的独立 prop_<id> 图层（忽略 _ref_* 等辅助层）
local function discoverCustomPropLayers(layers)
  for _, layer in ipairs(layers) do
    if layer.isGroup then
      if layer.name == "35_notice_papers" then
        collectNoticePapers(layer)
      elseif not knownLayers[layer.name] then
        discoverCustomPropLayers(layer.layers)
      end
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
  local states = {}
  local missingLayer = false
  for _, st in ipairs(prop.states) do
    local layer = findLayer(spr.layers, st.layer)
    if not layer and not st.optional then
      missingLayer = true
    elseif layer and layer.isGroup then
      -- 仅在未保存的导出副本中合成这个零件，母版保留可编辑的层板和书组。
      local parent, index = layer.parent, layer.stackIndex
      app.range.layers = { layer }
      app.command.FlattenLayers()
      parent.layers[index].name = st.layer
      app.range:clear()
    end
    if not st.optional or (layer and computeUnionBounds({ st.layer })) then
      table.insert(layerNames, st.layer)
      table.insert(states, st)
    end
  end
  if not missingLayer then
    local bounds = computeUnionBounds(layerNames)
    if bounds then
      local statesMeta = {}
      for _, st in ipairs(states) do
        local relFile = "props/" .. st.file
        local outPath = room.outDir .. relFile
        local frames = exportTrimmedLayer(st.layer, bounds, outPath, room.exportScale)
        print(string.format("[%s] Exported %s (%dx%d @ %dx, %d frame(s))", roomId, relFile, bounds.width, bounds.height, room.exportScale, frames))
        table.insert(statesMeta, {
          id = st.id,
          src = relFile,
          frames = frames,
          frameDurationMs = st.durationMs or frameDurationMs,
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
end

-- 4. 序列化为格式化的 JSON 写入 manifestPath
local ARRAY_KEYS = {
  sections = true,
  props = true,
  states = true,
  color = true,
}

local function toJson(val, indent, keyName)
  indent = indent or 0
  local pad = string.rep("  ", indent)
  local nextPad = string.rep("  ", indent + 1)
  local t = type(val)
  if t == "nil" then
    return "null"
  elseif t == "boolean" or t == "number" then
    return tostring(val)
  elseif t == "string" then
    -- Lua's %q emits Lua-only escapes for multiline user data.
    local escaped = val:gsub('[%z\1-\31\\"]', function(char)
      if char == '"' or char == '\\' then return '\\' .. char end
      return string.format('\\u%04x', string.byte(char))
    end)
    return '"' .. escaped .. '"'
  elseif t == "table" then
    local isArray = (#val > 0) or (keyName and ARRAY_KEYS[keyName])
    if isArray then
      if #val == 0 then
        return "[]"
      end
      if #val == 3 and type(val[1]) == "number" then
        return string.format("[%d, %d, %d]", val[1], val[2], val[3])
      end
      local items = {}
      for i = 1, #val do
        table.insert(items, nextPad .. toJson(val[i], indent + 1, nil))
      end
      return "[\n" .. table.concat(items, ",\n") .. "\n" .. pad .. "]"
    else
      local keyOrder = {
        "artBase", "baseWidth", "baseHeight", "exportScale", "exportWidth", "exportHeight",
        "background", "hotspotMask", "sections", "props",
        "id", "label", "key", "color", "x", "y", "width", "height", "zIndex",
        "interactive", "priority", "labelBelow", "outline",
        "action", "type", "text",
        "defaultState", "states", "src", "frames", "frameDurationMs",
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
        table.insert(pairsList, nextPad .. string.format("%q", k) .. ": " .. toJson(val[k], indent + 1, k))
      end
      return "{\n" .. table.concat(pairsList, ",\n") .. "\n" .. pad .. "}"
    end
  end
  return "null"
end

local manifest = {
  artBase = room.artBase,
  baseWidth = baseW,
  baseHeight = baseH,
  exportScale = room.exportScale,
  exportWidth = baseW * room.exportScale,
  exportHeight = baseH * room.exportScale,
  background = "study.png",
  hotspotMask = "hotspots.png",
  sections = exportedSections,
  props = exportedProps,
}

local f = io.open(room.manifestPath, "w")
f:write(toJson(manifest, 0, nil) .. "\n")
f:close()
print(string.format("[%s] Generated %s (%d section(s), %d modular prop(s)).", roomId, room.manifestPath, #exportedSections, #exportedProps))

spr:close()

-- 5. 同步按相同倍率导出 artwork/study/ui/*.png -> public/art/study/ui/*.png
local uiSrcDir = "artwork/study/ui/"
local uiOutDir = room.outDir .. "ui/"
if app.fs.isDirectory(uiSrcDir) then
  for _, file in ipairs(app.fs.listFiles(uiSrcDir)) do
    if file:sub(-4) == ".png" then
      local uiSpr = app.open(uiSrcDir .. file)
      app.activeSprite = uiSpr
      app.command.ChangePixelFormat{ format="rgb" }
      local srcImg = uiSpr.cels[1] and uiSpr.cels[1].image
      if srcImg then
        local outImg = scaleImageNearest(srcImg, room.exportScale)
        outImg:saveAs(uiOutDir .. file)
        print(string.format("[ui] Exported ui/%s (%dx%d @ %dx)", file, srcImg.width, srcImg.height, room.exportScale))
      end
      uiSpr:close()
    end
  end
end
