-- Rebuild the floor in the indexed starter background from four 56×16 tiles.
local art = "artwork/study/side-view/"
local base = app.open(art .. "variants/study-side-view-pixel-640.png")
local sheet = app.open(art .. "tiles/warm-flagstones.png")
assert(base.colorMode == ColorMode.INDEXED and base.width == 640 and base.height == 360)
assert(sheet.colorMode == ColorMode.INDEXED and sheet.width == 224 and sheet.height == 16)
local tiles = sheet.cels[1].image
local ground = base.cels[1].image:clone()

-- Rows grow towards the viewer. Each sequence gives the tile IDs from left to
-- right, with its own starting offset so the joints are staggered.
local rows = {
  { top=278, height=6,  width=38, left=-46, shade=2, order="13241324" },
  { top=284, height=8,  width=42, left=-49,  shade=1, order="24131432" },
  { top=292, height=9,  width=45, left=-53,  shade=0, order="41231342" },
  { top=301, height=11, width=48, left=-104, shade=0, order="13423124" },
  { top=312, height=13, width=52, left=-9,   shade=0, order="23141234" },
  { top=325, height=15, width=58, left=-27,  shade=0, order="32413142" },
}
local widths = { 1, 1.09, 0.93, 1.16 }
for _, course in ipairs(rows) do
  for row = 0, course.height - 1 do
    local y = course.top + row
    local v = math.floor(row * 15 / (course.height - 1) + 0.5)
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
        local u = math.floor((x - left) * 56 / width)
        local ink = tiles:getPixel((tile - 1) * 56 + u, v)
        assert(ink >= 8 and ink <= 15, "Paint the tiles with the warm stone ramp (indices 8–15)")
        -- The small moss tufts overlap the very front of the last course.
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
base:saveAs(art .. "variants/study-side-view-pixel-640.png")
base:close()
