-- Rebuild the floor in the indexed starter background from six 112×24 slabs.
local art = "artwork/study/room/"
local base = app.open(art .. "room-base.png")
local sheet = app.open(art .. "tiles/large-flagstones.png")
assert(base.colorMode == ColorMode.INDEXED and base.width == 640 and base.height == 360)
assert(sheet.colorMode == ColorMode.INDEXED and sheet.width == 672 and sheet.height == 24)
local tiles = sheet.cels[1].image
local ground = base.cels[1].image:clone()

-- Four deep courses. Slabs widen and grow towards the viewer; each sequence
-- starts at a different joint so no vertical seam lines up across the floor.
local rows = {
  { top=278, height=9,  width=80,  left=-55, shade=2, order="142536" },
  { top=287, height=12, width=96,  left=-17, shade=1, order="362514" },
  { top=299, height=16, width=112, left=-68, shade=0, order="524163" },
  { top=315, height=23, width=136, left=-31, shade=0, order="263415" },
}
local widths = { 1, 1.06, .95, 1.1, .98, 1.04 }
for _, course in ipairs(rows) do
  for row = 0, course.height - 1 do
    local y = course.top + row
    local v = math.floor(row * 23 / (course.height - 1) + 0.5)
    local scale = 1 + row * 0.002
    local edge = 400 + (course.left - 400) * scale - row * 0.27
    local col = 0
    while edge < ground.width do
      local i = col % #course.order + 1
      local tile = tonumber(course.order:sub(i, i))
      local left = math.floor(edge + 0.5)
      edge = edge + course.width * widths[tile] * scale
      local width = math.floor(edge + 0.5) - left
      for x = math.max(0, left), math.min(ground.width, left + width) - 1 do
        local u = math.floor((x - left) * 112 / width)
        local ink = tiles:getPixel((tile - 1) * 112 + u, v)
        assert(ink >= 8 and ink <= 15, "Paint the slabs with the warm stone ramp (indices 8–15)")
        if y < 338 or ground:getPixel(x, y) < 16 then
          ground:drawPixel(x, y, math.max(8, ink - course.shade))
        end
      end
      col = col + 1
    end
  end
end

local palette = Palette(base.palettes[1])
for ink = 8, 15 do
  palette:setColor(ink, sheet.palettes[1]:getColor(ink))
end
sheet:close()
base:setPalette(palette)
base.cels[1].image = ground
base:saveAs(art .. "room-base.png")
base:close()
