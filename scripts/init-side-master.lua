-- scripts/init-side-master.lua
-- 初始化 640×360 (4 帧循环动画) 的侧视书房 Aseprite 主工程：
--   artwork/study/side-view/study-side-master.aseprite
--
-- 图层结构设计：
--   _ref_reference        (隐藏备份：从 1280×720 reference.jpg 缩放至 640×360 的参考原图)
--   00_room_base          (23 色石砖墙与带苔平台)
--   05_floor_light/      (地面环境冷影、壁灯暖光与窗光，压在家具下方)
--   10_beyond/
--     prop_window_view    (窗外天空、山谷与浮空城堡，独立于石窗框)
--   20_furniture/
--     prop_window_frame   (双尖拱石窗框与窗台，开孔处露出独立窗景)
--     prop_door           (左侧拱门)
--     prop_chalkboard_frame (黑板木框与空石板)
--     prop_wall_lamp      (门与黑板之间的铜壁灯，含四帧火苗)
--     prop_desk           (胡桃木空桌与石墨灰桌架)
--     prop_computer       (显示器、底座、键盘与鼠标)
--     prop_monitor_pulse  (显示屏曲线上的四帧运算光点)
--     prop_book           (摊开的书与桌面接触阴影)
--     prop_desk_chair     (椅背在左、坐垫朝右的布面工作椅，包含椅轮接触阴影)
--     prop_bookcase/      (右侧书柜：柜体、四块层板与可移动的书组、黄铜四面体)
--   30_chalkboard/
--     prop_chalkboard_d1  (黑板数学图 1)
--     prop_chalkboard_d2  (黑板数学图 2，默认隐藏)
--     prop_chalkboard_d3  (黑板数学图 3，默认隐藏)
--     prop_chalk_tray     (黑板下沿粉笔槽)
--   40_lights_and_screens/
--     prop_monitor_pulse             (屏幕曲线上的四帧运算光点)
--     prop_candle_desk_lit / unlit   (桌面蜡烛预留：4 帧火苗 / 熄灭青烟)
--   90_custom_props/                 (预留组：后续新增承载 News / Side quests 等的 prop_* 图层放这里)
--   99_hotspot_mask                  (默认隐藏：640×360 六大主栏目颜色索引掩膜层)

local NUM_FRAMES = 4
local FRAME_DURATION = 0.18

local rgba = app.pixelColor.rgba

local pixelRoom = app.open("artwork/study/side-view/variants/study-side-view-pixel-640.png")
local BASE_W, BASE_H = pixelRoom.width, pixelRoom.height
local palette = Palette(pixelRoom.palettes[1])
app.activeSprite = pixelRoom
app.command.ChangePixelFormat{ format="rgb" }
local baseImg = pixelRoom.cels[1].image:clone()
pixelRoom:close()

local srcSpr = app.open("artwork/study/side-view/reference.jpg")
app.activeSprite = srcSpr
app.command.ChangePixelFormat{ format="rgb" }
srcSpr:resize(BASE_W, BASE_H)

local refImg = Image(BASE_W, BASE_H, ColorMode.RGB)
refImg:clear(rgba(0, 0, 0, 255))
if srcSpr.cels[1] then
  refImg:drawImage(srcSpr.cels[1].image, srcSpr.cels[1].position)
end
srcSpr:close()

local master = Sprite(BASE_W, BASE_H, ColorMode.RGB)
app.activeSprite = master
master:setPalette(palette)
master.frames[1].duration = FRAME_DURATION
for f = 2, NUM_FRAMES do
  local frame = master:newEmptyFrame(f)
  frame.duration = FRAME_DURATION
end

local function makeEmptyImg()
  local img = Image(BASE_W, BASE_H, ColorMode.RGB)
  img:clear(rgba(0, 0, 0, 0))
  return img
end

local function fillAllFrames(layer, img, pos)
  local pt = pos or Point(0, 0)
  for f = 1, NUM_FRAMES do
    master:newCel(layer, f, img:clone(), pt)
  end
end

local function addPropLayer(parentGroup, name, visible, continuous)
  local layer = master:newLayer()
  layer.name = name
  layer.parent = parentGroup
  if visible ~= nil then
    layer.isVisible = visible
  end
  if continuous then
    layer.isContinuous = true
    master:newCel(layer, 1, makeEmptyImg(), Point(0, 0))
  else
    fillAllFrames(layer, makeEmptyImg())
  end
  return layer
end

-- 静态画稿的四帧链接到同一张图，编辑任意一帧都不会在播放时闪回旧画面。
local function fillLinkedFrames(layer, image, pos)
  layer.isContinuous = true
  local frames = {}
  for f = 1, NUM_FRAMES do
    master:newCel(layer, f, image, pos)
    frames[f] = f
  end
  app.range.layers = { layer }
  app.range.frames = frames
  app.command.LinkCels()
  app.range:clear()
end

local propDir = "artwork/study/side-view/props/"
local function addStaticImage(group, name, image, x, y)
  local layer = master:newLayer()
  layer.name = name
  layer.parent = group
  fillLinkedFrames(layer, image, Point(x, y))
  return layer
end

local function addStaticProp(group, name, file, x, y)
  addStaticImage(group, name, Image{ fromFile = propDir .. file }, x, y)
end

-- 四帧火苗和屏幕光点各自独立成像，不链接 cel；导出脚本会自动识别为动画。
local function addAnimatedImages(group, name, images, x, y)
  assert(#images == NUM_FRAMES, name .. " needs " .. NUM_FRAMES .. " frames")
  local layer = master:newLayer()
  layer.name = name
  layer.parent = group
  for f, image in ipairs(images) do
    master:newCel(layer, f, image, Point(x, y))
  end
  return layer
end

-- 1. 23 色底图
local baseLayer = master.layers[1]
baseLayer.name = "00_room_base"
fillLinkedFrames(baseLayer, baseImg, Point(0, 0))

local floorLight = master:newGroup()
floorLight.name = "05_floor_light"
-- 先铺地面冷影，再叠壁灯暖光，最后放窗光；三者都不遮住家具。
addStaticProp(floorLight, "prop_floor_shade", "floor-shade.png", 0, 277)
addStaticProp(floorLight, "prop_wall_lamp_glow", "wall-lamp-glow.png", 75, 79)
-- 两个尖拱和顶部小窗一同投向右前方；窗台投在后沿，窗顶投在前沿。
addStaticProp(floorLight, "prop_window_light", "window-light.png", 456, 284)

-- 2. 窗外风景层
local beyondGroup = master:newGroup()
beyondGroup.name = "10_beyond"
addStaticProp(beyondGroup, "prop_window_view", "window-view.png", 418, 24)

-- 3. 静态家具层（便于独立调节位置、自动 Alpha 描边、补全后方砖墙）
local furnitureGroup = master:newGroup()
furnitureGroup.name = "20_furniture"
addStaticProp(furnitureGroup, "prop_window_frame", "window-frame.png", 399, 5)
addStaticProp(furnitureGroup, "prop_door", "door.png", 4, 66)
addStaticProp(furnitureGroup, "prop_chalkboard_frame", "chalkboard-frame.png", 132, 76)
addStaticProp(furnitureGroup, "prop_noticeboard", "noticeboard.png", 349, 84)
addStaticProp(furnitureGroup, "prop_supply_box", "supply-box.png", 285, 240)
-- 灯座不动，四帧只改火苗；墙脚与地面的暖光已单独烘焙在地光层。
local lamp = Image{ fromFile = propDir .. "wall-lamp.png" }
local lampFrames = {}
for i = 1, NUM_FRAMES do
  local frame = lamp:clone()
  frame:drawImage(Image{ fromFile = propDir .. "wall-lamp-flame-" .. i .. ".png" }, Point(3, 10))
  lampFrames[i] = frame
end
addAnimatedImages(furnitureGroup, "prop_wall_lamp", lampFrames, 112, 103)
addStaticProp(furnitureGroup, "prop_desk", "desk.png", 338, 216)
addStaticProp(furnitureGroup, "prop_computer", "computer.png", 362, 173)
addStaticProp(furnitureGroup, "prop_book", "book.png", 456, 214)
addStaticProp(furnitureGroup, "prop_desk_chair", "desk-chair.png", 365, 216)
local bookcase = master:newGroup()
bookcase.name = "prop_bookcase"
bookcase.parent = furnitureGroup
local caseX, caseY = 544, 71
addStaticProp(bookcase, "frame", "bookcase/frame.png", caseX, caseY)

local parts = {}
for _, name in ipairs({ "shelf", "upright", "leaning", "stack" }) do
  parts[name] = Image{ fromFile = propDir .. "bookcase/" .. name .. ".png" }
end
-- 每组书按底边对齐同一块层板。横向偏移量相对柜体，无需重画即可重新排列。
local shelves = {
  { { "upright", 11 }, { "upright", 40 } },
  { { "upright", 12 }, { "leaning", 40 } },
  { { "stack", 12 } },
  { { "stack", 12 }, { "upright", 44 } },
}
for row, books in ipairs(shelves) do
  local tier = master:newGroup()
  tier.name = "shelf_" .. row
  tier.parent = bookcase
  local y = caseY + 52 + (row - 1) * 46
  addStaticImage(tier, "board", parts.shelf, caseX + 10, y)
  for i, book in ipairs(books) do
    local kind, x = book[1], book[2]
    local image = parts[kind]
    addStaticImage(tier, kind .. "_" .. i, image, caseX + x, y + 2 - image.height)
  end
  if row == 3 then
    local ornament = Image{ fromFile = propDir .. "tetrahedron.png" }
    addStaticImage(tier, "tetrahedron", ornament, caseX + 53, y + 2 - ornament.height)
  end
end

-- 4. 黑板粉笔图与粉笔槽
local chalkGroup = master:newGroup()
chalkGroup.name = "30_chalkboard"
addStaticProp(chalkGroup, "prop_chalkboard_d1", "chalk-diagram.png", 157, 91)
addPropLayer(chalkGroup, "prop_chalkboard_d2", false, true)
addPropLayer(chalkGroup, "prop_chalkboard_d3", false, true)
addPropLayer(chalkGroup, "prop_chalk_tray", true, true)

-- 便签共用纸片原稿。复制图层后，图层名即标题，User Data 文本即正文。
local papers = master:newGroup()
papers.name = "35_notice_papers"
local paperImage = Image{ fromFile = propDir .. "notice-paper.png" }
local function pinNote(title, text, x, y)
  local layer = addStaticImage(papers, title, paperImage, x, y)
  layer.data = text
end
pinNote("On the board", "Join either end of a diameter to a third point on the circle. The angle at that point is a right angle.", 355, 93)
pinNote("Reading marker", "The open book is at the triangle diagram. Compare it with the construction on the slate.", 365, 113)
pinNote("Spare supplies", "Find the rolled plans, file folder and spare cable in the box beside the desk.", 356, 134)

-- 5. 动态光源与屏幕
local lightsGroup = master:newGroup()
lightsGroup.name = "40_lights_and_screens"
local pulses = {}
for i = 1, NUM_FRAMES do
  pulses[i] = Image{ fromFile = propDir .. "monitor-pulse-" .. i .. ".png" }
end
addAnimatedImages(lightsGroup, "prop_monitor_pulse", pulses, 362, 173)
addPropLayer(lightsGroup, "prop_candle_desk_lit", true, false)
addPropLayer(lightsGroup, "prop_candle_desk_unlit", false, false)

-- 6. 预留新增物体组（未来添加 News / Side quests 等载体时新建 prop_<id> 图层放入此组）
local customGroup = master:newGroup()
customGroup.name = "90_custom_props"

-- 7. 热点颜色掩膜层（默认隐藏；留空表示尚未绑定大栏目热点，后续按颜色填涂即可）
local maskLayer = master:newLayer()
maskLayer.name = "99_hotspot_mask"
maskLayer.isVisible = false
maskLayer.isContinuous = true
master:newCel(maskLayer, 1, makeEmptyImg(), Point(0, 0))

-- 8. 参考备份层（以 _ref_ 开头，导出脚本会忽略；保留缩放后的参考图供取色/对照）
local refLayer = master:newLayer()
refLayer.name = "_ref_reference"
refLayer.isVisible = false
refLayer.isEditable = false
refLayer.isContinuous = true
master:newCel(refLayer, 1, refImg:clone(), Point(0, 0))

master:saveCopyAs("artwork/study/side-view/study-side-master.aseprite")
print("Saved artwork/study/side-view/study-side-master.aseprite (" .. BASE_W .. "x" .. BASE_H .. ", " .. NUM_FRAMES .. " frames)")
master:close()
