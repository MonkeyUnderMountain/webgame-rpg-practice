"""Draw the original game sprites. Run with `python tools/draw_pixel_art.py`."""

from math import ceil, floor
from pathlib import Path
from random import Random
from struct import pack
from zlib import compress, crc32



# 绘图基础
ROOT = Path(__file__).resolve().parents[1]
WORLD_ART = ROOT / "public" / "art" / "world"
ARCHIVE_ART = ROOT / "archive" / "art"
INK = "#141722"


def rgba(color):
    if isinstance(color, tuple):
        return color
    color = color.lstrip("#")
    return (*bytes.fromhex(color), 255)


def chunk(tag, data):
    return pack(">I", len(data)) + tag + data + pack(">I", crc32(tag + data))


class Sprite:
    def __init__(self, width=24, height=24, fill=(0, 0, 0, 0)):
        self.width, self.height = width, height
        self.rows = [bytearray(rgba(fill) * width) for _ in range(height)]

    def dot(self, x, y, color):
        if 0 <= x < self.width and 0 <= y < self.height:
            self.rows[y][x * 4:x * 4 + 4] = bytes(rgba(color))

    def rect(self, x, y, w, h, color):
        if w <= 0 or h <= 0:
            return
        x1, x2 = max(0, x), min(self.width, x + w)
        if x1 >= x2:
            return
        row = bytes(rgba(color)) * (x2 - x1)
        for py in range(max(0, y), min(self.height, y + h)):
            self.rows[py][x1 * 4:x2 * 4] = row

    def line(self, x1, y1, x2, y2, color):
        dx, dy = abs(x2 - x1), -abs(y2 - y1)
        sx, sy = (1 if x1 < x2 else -1), (1 if y1 < y2 else -1)
        error = dx + dy
        while True:
            self.dot(x1, y1, color)
            if x1 == x2 and y1 == y2:
                return
            step = 2 * error
            if step >= dy:
                error += dy
                x1 += sx
            if step <= dx:
                error += dx
                y1 += sy

    def poly(self, vertices, color):
        for y in range(min(p[1] for p in vertices), max(p[1] for p in vertices) + 1):
            intersections = []
            for a, b in zip(vertices, vertices[1:] + vertices[:1]):
                if a[1] <= y < b[1] or b[1] <= y < a[1]:
                    intersections.append(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]))
            intersections.sort()
            for start, end in zip(intersections[::2], intersections[1::2]):
                left, right = ceil(start), floor(end)
                self.rect(left, y, right - left + 1, 1, color)

    def ellipse(self, cx, cy, rx, ry, color):
        for y in range(cy - ry, cy + ry + 1):
            for x in range(cx - rx, cx + rx + 1):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                    self.dot(x, y, color)

    def grain(self, seed, count, colors, box=None):
        rng = Random(seed)
        x, y, w, h = box or (0, 0, self.width, self.height)
        for _ in range(count):
            self.dot(x + rng.randrange(w), y + rng.randrange(h), rng.choice(colors))

    def save(self, path):
        # 写入未滤波的 RGBA 扫描行，让生成脚本只依赖 Python 标准库。
        scanlines = b"".join(b"\0" + row for row in self.rows)
        png = b"\x89PNG\r\n\x1a\n"
        png += chunk(b"IHDR", pack(">IIBBBBB", self.width, self.height, 8, 6, 0, 0, 0))
        png += chunk(b"IDAT", compress(scanlines, 9)) + chunk(b"IEND", b"")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(png)



# 地形图块
def ground():
    tiles = WORLD_ART / "tiles"
    archived_study = ARCHIVE_ART / "study"
    floor_tile = Sprite(fill="#654738")
    for y, color, seam in [(0, "#6e4d3c", 15), (8, "#624334", 7), (16, "#694938", 20)]:
        floor_tile.rect(0, y, 24, 7, color)
        floor_tile.rect(0, y, 24, 1, "#785442")
        floor_tile.rect(0, y + 7, 24, 1, "#493328")
        floor_tile.rect(seam, y + 1, 1, 6, "#51382e")
        floor_tile.rect(seam + 1, y + 2, 1, 5, "#765340")
        floor_tile.rect((seam + 5) % 15, y + 3, 5, 1, "#795442")
    floor_tile.grain(12, 18, ["#5b4033", "#72503e"])
    floor_tile.save(archived_study / "roomFloor.png")

    room = Sprite(fill="#24313b")
    room.rect(0, 0, 24, 2, "#17232e")
    room.rect(0, 2, 24, 1, "#51606a")
    room.rect(0, 3, 24, 13, "#31404a")
    room.rect(0, 4, 24, 1, "#3f4c56")
    room.rect(2, 5, 1, 11, "#344651")
    room.rect(21, 5, 1, 11, "#293841")
    room.rect(0, 16, 24, 2, "#141e27")
    room.rect(0, 18, 24, 2, "#695049")
    room.rect(0, 20, 24, 4, "#503632")
    room.rect(0, 23, 24, 1, "#281f23")
    room.grain(4, 13, ["#354550", "#2f3e49"], (1, 5, 22, 10))
    room.save(archived_study / "roomWall.png")

    grass = Sprite(fill="#354e52")
    grass.grain(644, 42, ["#3d595b", "#2b454e", "#3d6661", "#4c665f"])
    for x, y in [(3, 6), (19, 10), (8, 20)]:
        grass.dot(x, y, "#668176")
        grass.dot(x + 1, y + 1, "#526e67")
        grass.dot(x + 1, y + 2, "#264751")
        grass.dot(x + 2, y, "#3e6b69")
    grass.save(tiles / "grass.png")

    path = Sprite(fill="#6e655e")
    path.grain(59, 48, ["#776a64", "#695b58", "#736b69", "#827165", "#625b58"])
    for x, y in [(3, 5), (12, 17), (19, 10)]:
        path.rect(x, y, 2, 1, "#8d7972")
        path.rect(x + 1, y + 1, 2, 1, "#574f53")
    path.save(tiles / "path.png")

    water = Sprite(fill="#252d57")
    water.grain(4, 25, ["#293c65", "#2c4a6f", "#232b51"])
    for x, y, w in [(2, 3, 8), (12, 9, 9), (2, 14, 13), (15, 19, 7)]:
        water.rect(x, y, w, 1, "#3d537B")
        water.rect(x + 2, y, 3, 1, "#62779c")
        water.rect(x - 1, y + 1, 2, 1, "#2e426c")
    water.save(tiles / "water.png")

    stone = Sprite(fill="#383b4b")
    for x, y, w, h in [(0, 0, 13, 11), (14, 0, 10, 11), (0, 12, 8, 12), (9, 12, 15, 12)]:
        stone.rect(x, y, w, h, "#545565")
        stone.rect(x, y, w, 1, "#636373")
        stone.rect(x, y+h-1, w, 1, "#4a4a5c")
    stone.grain(24, 28, ["#4c4c5d", "#5c5d6e", "#505261"])
    stone.save(tiles / "stone.png")

    wall = Sprite(fill="#282b42")
    for x, y, w, h in [(0, 0, 10, 9), (11, 0, 13, 9), (0, 10, 16, 8), (17, 10, 7, 8)]:
        wall.rect(x, y, w, h, "#454660")
        wall.rect(x, y, w, 1, "#696b83")
        wall.rect(x, y + 1, 1, h - 1, "#565775")
        wall.rect(x, y + h - 1, w, 1, "#353650")
    wall.rect(0, 18, 24, 3, "#292d40")
    wall.rect(0, 21, 24, 3, "#1e2634")
    wall.grain(56, 21, ["#3d455d", "#545471", "#383850"], (0, 3, 24, 16))
    for x, y in [(2, 15), (3, 16), (5, 17), (20, 1), (19, 3), (21, 4)]:
        wall.rect(x, y, 2, 1, "#3e625e")
    wall.save(tiles / "ruinWall.png")

    gap = Sprite(fill="#191d32")
    gap.grain(888, 15, ["#232840", "#272942", "#1b2438"])
    gap.rect(0, 2, 24, 1, "#28283e")
    gap.rect(5, 13, 13, 1, "#2a2f44")
    gap.rect(4, 14, 6, 1, "#23263d")
    gap.save(tiles / "void.png")

    bridge = Sprite(fill="#28394c")
    for y in [1, 7, 13, 19]:
        bridge.rect(0, y, 24, 5, "#918176")
        bridge.rect(0, y, 24, 1, "#c4a38a")
        bridge.rect(0, y + 4, 24, 1, "#62556b")
        bridge.rect(3, y + 2, 4, 1, "#a0887d")
    for x in [1, 21]:
        bridge.rect(x, 0, 2, 24, "#43566c")
        bridge.rect(x, 0, 1, 24, "#7996a1")
    bridge.save(tiles / "bridge.png")



# 旧版书房陈设
def furniture():
    study = ARCHIVE_ART / "study"
    desk = Sprite(96, 48)
    desk.ellipse(47, 40, 45, 5, (23, 18, 24, 94))
    desk.rect(6, 10, 84, 31, "#33252b")
    desk.rect(8, 11, 80, 25, "#6b4435")
    desk.rect(6, 12, 84, 16, "#9a6748")
    desk.rect(6, 12, 84, 2, "#cc9666")
    desk.rect(8, 14, 80, 12, "#ab7450")
    desk.rect(6, 27, 84, 2, "#704735")
    desk.rect(6, 29, 84, 2, "#51302a")
    desk.rect(11, 31, 12, 7, "#775040")
    desk.rect(76, 31, 8, 7, "#89513f")
    desk.rect(13, 33, 4, 1, "#d49a67")
    desk.rect(25, 33, 48, 8, "#3b2929")
    desk.rect(9, 39, 12, 3, "#2c2430")
    desk.rect(76, 39, 12, 3, "#2c2430")
    desk.grain(15, 46, ["#bd8256", "#976246"], (7, 15, 80, 11))
    # 桌上的摊开书本、笔记和台灯。
    desk.rect(23, 16, 23, 10, "#6a4840")
    desk.rect(24, 16, 10, 8, "#e1be91")
    desk.rect(35, 16, 10, 8, "#f0d6a2")
    desk.rect(34, 17, 1, 8, "#a77754")
    for x in (26, 37):
        for y in (18, 20, 22):
            desk.rect(x, y, 5 if y < 22 else 3, 1, "#b79771")
    desk.rect(47, 22, 8, 1, "#45373a")
    desk.rect(54, 21, 2, 2, "#c39c63")
    desk.rect(65, 22, 12, 3, "#614536")
    desk.rect(68, 21, 7, 1, "#e2af69")
    desk.rect(71, 8, 2, 15, "#51413c")
    desk.poly([(64, 3), (76, 3), (81, 13), (61, 13)], "#1d3440")
    desk.poly([(65, 4), (75, 4), (78, 11), (63, 11)], "#47746b")
    desk.rect(64, 11, 14, 2, "#ffd495")
    desk.rect(66, 13, 11, 1, "#f1ae69")
    desk.save(study / "desk.png")

    shelf = Sprite(72, 48)
    shelf.rect(1, 3, 70, 43, "#28252d")
    shelf.rect(3, 3, 66, 41, "#87583e")
    shelf.rect(2, 1, 68, 3, "#ba8a5d")
    shelf.rect(2, 4, 68, 2, "#63402f")
    for y in (7, 24):
        shelf.rect(7, y, 58, 14, "#362b32")
        shelf.rect(8, y + 1, 57, 2, "#4a3633")
        shelf.rect(5, y + 14, 62, 2, "#ae7852")
        shelf.rect(7, y + 16, 58, 1, "#58382d")
    rng = Random(46)
    bindings = [("#567a69", "#7f9a7e"), ("#794952", "#cc7f78"), ("#98734b", "#d8a860"), ("#486477", "#79a0a3"), ("#66547b", "#a787ac")]
    for y in (20, 37):
        x = 9
        while x < 61:
            width, height = rng.randrange(3, 6), rng.randrange(7, 12)
            binding, trim = rng.choice(bindings)
            shelf.rect(x, y - height, width, height, binding)
            shelf.rect(x, y - height, width, 1, trim)
            shelf.rect(x + 1, y - height + 3, max(1, width - 2), 1, trim)
            shelf.rect(x + width - 1, y - height + 1, 1, height - 1, "#3c343d")
            x += width + rng.randrange(0, 2)
    shelf.rect(4, 7, 1, 34, "#b47950")
    shelf.rect(66, 7, 1, 34, "#af7a56")
    shelf.rect(1, 42, 70, 3, "#9d6b50")
    shelf.rect(5, 45, 6, 2, "#38292b")
    shelf.rect(61, 45, 6, 2, "#38292b")
    shelf.save(study / "books.png")

    board = Sprite(72, 48)
    board.rect(1, 6, 70, 35, "#25242e")
    board.rect(3, 5, 66, 33, "#9e7452")
    board.rect(3, 5, 66, 1, "#ce9362")
    board.rect(6, 8, 60, 27, "#263e42")
    board.rect(7, 9, 58, 2, "#1f3039")
    board.grain(99, 65, ["#2a4246", "#2e484a", "#24393b"], (8, 11, 56, 23))
    for x, y, w in [(11, 14, 20), (11, 18, 13), (12, 24, 15), (13, 28, 10), (48, 27, 10)]:
        board.rect(x, y, w, 1, "#8c9b86")
    board.rect(35, 13, 12, 14, "#ddba7e")
    board.rect(36, 14, 10, 2, "#f3d69f")
    board.rect(37, 18, 8, 1, "#987a5e")
    board.rect(37, 21, 6, 1, "#ad8c6a")
    board.dot(40, 13, "#c46556")
    board.rect(54, 12, 6, 10, "#c9897d")
    board.dot(57, 12, "#f9d59e")
    board.rect(7, 35, 58, 2, "#c29162")
    board.rect(54, 34, 6, 1, "#e3d9ab")
    board.save(study / "board.png")

    console = Sprite(48, 48)
    console.ellipse(24, 41, 22, 4, (25, 19, 29, 75))
    console.rect(5, 26, 39, 16, "#241c28")
    console.rect(7, 27, 34, 11, "#76503e")
    console.rect(5, 26, 39, 3, "#b68059")
    console.rect(10, 36, 9, 1, "#ac845e")
    console.rect(8, 5, 31, 22, "#211e2a")
    console.rect(10, 5, 27, 20, "#6a6177")
    console.rect(10, 7, 27, 1, "#938498")
    console.rect(12, 8, 20, 13, "#141c2c")
    console.rect(14, 9, 16, 10, "#2e4b58")
    console.rect(15, 10, 13, 1, "#6b98a4")
    console.rect(17, 15, 3, 2, "#7cc5ac")
    console.rect(23, 13, 2, 3, "#506f85")
    console.dot(34, 20, "#ed916f")
    console.rect(31, 30, 10, 4, "#352c38")
    console.dot(34, 31, "#b5a5a2")
    console.dot(38, 31, "#d27788")
    console.save(study / "console.png")

    rug = Sprite(96, 48)
    rug.rect(3, 3, 90, 42, "#352a39")
    rug.rect(4, 4, 88, 40, "#773f4f")
    rug.rect(6, 6, 84, 36, "#bd7b61")
    rug.rect(7, 7, 82, 34, "#54364c")
    rug.rect(10, 10, 76, 28, "#8f4f57")
    rug.rect(11, 11, 74, 26, "#79454e")
    for x in range(17, 83, 15):
        rug.poly([(x, 15), (x + 8, 24), (x, 33), (x - 8, 24)], "#b27062")
        rug.poly([(x, 19), (x + 5, 24), (x, 29), (x - 5, 24)], "#66394d")
        rug.dot(x, 24, "#d89871")
    for x in range(6, 91, 3):
        rug.rect(x, 1, 1, 3, "#c99772")
        rug.rect(x, 44, 1, 3, "#c99772")
    rug.save(study / "rug.png")

    bed = Sprite(48, 72)
    bed.ellipse(24, 65, 22, 5, (25, 18, 22, 95))
    bed.rect(3, 4, 42, 61, "#33232b")
    bed.rect(5, 4, 38, 59, "#9a6450")
    bed.rect(5, 6, 38, 3, "#c58a62")
    bed.rect(7, 13, 34, 43, "#57747b")
    bed.rect(9, 15, 30, 15, "#9a9ba2")
    bed.rect(10, 15, 27, 11, "#d1c4b1")
    bed.rect(11, 16, 25, 2, "#ead7b9")
    bed.rect(7, 30, 34, 28, "#486973")
    bed.rect(9, 31, 30, 3, "#718b87")
    bed.rect(11, 36, 26, 1, "#6b8183")
    for x, y in [(12, 45), (19, 48), (31, 40), (27, 51), (13, 55)]:
        bed.rect(x, y, 4, 1, "#55747e")
    bed.rect(5, 58, 38, 4, "#b77f5c")
    bed.rect(6, 62, 36, 2, "#56372f")
    bed.save(study / "bed.png")

    window = Sprite(72, 48)
    window.rect(3, 2, 66, 43, "#1c2635")
    window.rect(5, 3, 62, 40, "#965f49")
    window.rect(7, 5, 58, 36, "#292d43")
    for y, color in [(6, "#253758"), (12, "#2c4265"), (18, "#41527b"), (24, "#59648c"), (31, "#596681")]:
        window.rect(9, y, 54, 7, color)
    window.poly([(9, 32), (17, 27), (23, 31), (31, 24), (38, 28), (49, 22), (62, 29), (64, 39), (9, 39)], "#303851")
    window.poly([(9, 36), (20, 33), (30, 36), (42, 30), (53, 34), (57, 31), (64, 35), (63, 40), (9, 40)], "#27313d")
    for x, y in [(12, 9), (16, 13), (25, 16), (30, 11), (43, 14), (52, 8), (58, 18)]:
        window.dot(x, y, "#a2b6cf")
    window.ellipse(54, 14, 4, 4, "#dbceaa")
    window.ellipse(56, 12, 3, 3, "#2c4265")
    window.rect(34, 6, 3, 34, "#68483c")
    window.rect(34, 7, 1, 32, "#a97956")
    window.rect(7, 22, 58, 2, "#755647")
    window.rect(2, 40, 68, 3, "#c29065")
    window.rect(2, 43, 68, 2, "#624337")
    window.save(study / "window.png")



# 室外装饰
def scenery():
    decor = WORLD_ART / "scenery"
    tree = Sprite(48, 48)
    tree.ellipse(25, 41, 19, 5, (24, 34, 43, 135))
    tree.poly([(16, 43), (21, 36), (21, 19), (27, 18), (27, 36), (33, 42)], "#303140")
    tree.rect(23, 22, 2, 18, "#615153")
    tree.rect(24, 28, 1, 10, "#836462")
    tree.line(23, 28, 15, 21, "#615153")
    tree.line(25, 25, 33, 15, "#6a5458")
    crowns = [
        (13, 22, 11, 9), (24, 25, 15, 9), (34, 24, 12, 8),
        (13, 15, 10, 9), (30, 13, 12, 9), (22, 11, 12, 10),
    ]
    for cx, cy, rx, ry in crowns:
        tree.ellipse(cx, cy, rx, ry, "#263c47")
        tree.ellipse(cx - 1, cy - 2, rx - 2, ry - 2, "#355454")
        tree.ellipse(cx - 3, cy - 3, rx - 5, ry - 4, "#41645d")
    rng = Random(44)
    for x, y in [(rng.randrange(5, 42), rng.randrange(2, 28)) for _ in range(110)]:
        if any(((x - cx) / (rx - 2)) ** 2 + ((y - cy) / (ry - 2)) ** 2 <= 1 for cx, cy, rx, ry in crowns):
            tree.rect(x, y, 2, 1, rng.choice(["#54736a", "#3f5f5c", "#658471", "#304b50"]))
    tree.save(decor / "tree.png")

    rock = Sprite()
    rock.ellipse(12, 17, 10, 4, (31, 32, 48, 120))
    rock.poly([(3, 15), (7, 7), (15, 5), (20, 11), (22, 17), (16, 20), (6, 19)], "#35394e")
    rock.poly([(4, 14), (8, 8), (15, 6), (19, 11), (15, 15), (7, 17)], "#696979")
    rock.poly([(14, 16), (19, 12), (22, 17), (16, 19), (7, 18)], "#4f5063")
    rock.rect(8, 9, 7, 1, "#8d8496")
    rock.rect(7, 11, 3, 1, "#778582")
    rock.rect(5, 15, 5, 1, "#678072")
    rock.save(decor / "rock.png")

    shrub = Sprite()
    shrub.ellipse(12, 18, 10, 4, (23, 37, 44, 126))
    for x, y, rx, ry in [(6, 15, 5, 5), (10, 12, 6, 7), (16, 13, 6, 6), (19, 16, 4, 4)]:
        shrub.ellipse(x, y, rx, ry, "#304952")
        shrub.ellipse(x - 1, y - 1, rx - 1, ry - 2, "#4e6e62")
    for x, y in [(4, 12), (7, 9), (10, 8), (12, 9), (14, 11), (17, 10), (18, 13), (10, 15), (7, 15), (18, 16)]:
        shrub.rect(x, y, 2, 1, "#698a72")
    shrub.save(decor / "shrub.png")

    flower = Sprite()
    for x, y, c in [(6, 12, "#ba98b7"), (10, 15, "#8f87aa"), (15, 9, "#c788ab"), (17, 15, "#a488ae")]:
        flower.line(x, y, x - 1, y + 5, "#587a67")
        flower.dot(x - 1, y + 3, "#759374")
        flower.dot(x + 1, y, c)
        flower.dot(x - 1, y, c)
        flower.dot(x, y + 1, c)
        flower.dot(x, y - 1, c)
        flower.dot(x, y, "#e8bca4")
    flower.save(decor / "flower.png")

    mushrooms = Sprite()
    for x, y, r in [(6, 14, 3), (12, 10, 4), (18, 15, 3)]:
        mushrooms.rect(x - 1, y, 2, 5, "#a98193")
        mushrooms.ellipse(x, y, r, 2, "#73577e")
        mushrooms.ellipse(x, y - 1, r - 1, 2, "#af7199")
        mushrooms.dot(x - 1, y - 1, "#dca7bc")
    mushrooms.save(decor / "mushrooms.png")

    reeds = Sprite()
    for x, y in [(8, 10), (12, 7), (16, 9), (18, 12)]:
        reeds.line(x, y, 12, 20, "#577a6d")
        reeds.rect(x, y - 2, 1, 3, "#bd9579")
        reeds.dot(x, y - 3, "#e3b391")
    reeds.save(decor / "reeds.png")

    crate = Sprite()
    crate.ellipse(12, 20, 10, 3, (23, 22, 35, 130))
    crate.rect(3, 6, 18, 15, "#39404a")
    crate.rect(4, 6, 16, 13, "#877061")
    crate.rect(4, 6, 16, 2, "#ba9271")
    crate.rect(6, 9, 12, 8, "#715c57")
    crate.rect(7, 10, 10, 1, "#926f62")
    crate.line(6, 16, 17, 9, "#b28d71")
    crate.rect(5, 18, 14, 1, "#aa826d")
    crate.save(decor / "crate.png")

    sign = Sprite()
    sign.rect(10, 8, 4, 13, "#332e39")
    sign.rect(11, 9, 2, 11, "#8a685a")
    sign.poly([(3, 6), (16, 6), (20, 10), (16, 14), (3, 14)], "#3a373f")
    sign.poly([(4, 6), (16, 6), (19, 10), (16, 13), (4, 13)], "#ae805f")
    sign.rect(5, 7, 10, 1, "#d5a07c")
    sign.rect(6, 9, 8, 1, "#795c56")
    sign.rect(6, 11, 5, 1, "#795c56")
    sign.save(decor / "sign.png")



# 传送门、道具和路标
def artifacts():
    objects = WORLD_ART / "objects"
    portal = Sprite()
    portal.ellipse(12, 21, 11, 2, (21, 19, 31, 139))
    portal.poly([(3, 21), (3, 9), (5, 5), (8, 2), (16, 2), (19, 5), (21, 9), (21, 21)], "#222b40")
    portal.poly([(4, 20), (4, 9), (7, 5), (9, 3), (15, 3), (18, 6), (20, 9), (20, 20)], "#756878")
    portal.poly([(6, 20), (6, 9), (9, 5), (15, 5), (18, 9), (18, 20)], "#372c46")
    portal.poly([(8, 20), (8, 10), (10, 7), (14, 7), (16, 10), (16, 20)], "#776291")
    portal.poly([(9, 20), (9, 11), (11, 8), (14, 8), (16, 12), (16, 20)], "#9b79a7")
    portal.rect(10, 11, 5, 9, "#cb9aaf")
    portal.rect(11, 12, 3, 8, "#f1bca5")
    portal.dot(12, 12, "#ffe3bc")
    portal.dot(8, 6, "#edbc9b")
    portal.dot(16, 6, "#ad98a7")
    portal.rect(4, 20, 16, 2, "#665365")
    portal.rect(8, 21, 8, 1, "#ad7c83")
    portal.save(objects / "portal.png")

    lamp = Sprite()
    lamp.ellipse(12, 17, 9, 5, (214, 153, 105, 49))
    lamp.ellipse(12, 15, 7, 7, (255, 188, 119, 52))
    lamp.rect(9, 5, 6, 3, "#544a55")
    lamp.rect(10, 4, 4, 2, "#d8a678")
    lamp.rect(7, 8, 10, 12, "#403746")
    lamp.rect(8, 9, 8, 10, "#c29475")
    lamp.rect(9, 11, 6, 6, "#e48661")
    lamp.rect(10, 11, 4, 6, "#f7bb78")
    lamp.rect(11, 12, 2, 4, "#fff0b6")
    lamp.rect(7, 18, 10, 2, "#956460")
    lamp.rect(8, 20, 8, 1, "#564354")
    lamp.save(objects / "lamp.png")

    rest = Sprite()
    rest.ellipse(12, 18, 10, 4, (25, 29, 43, 120))
    rest.ellipse(12, 15, 8, 6, (236, 135, 94, 75))
    rest.line(6, 18, 17, 21, "#986d5c")
    rest.line(17, 18, 6, 21, "#70524c")
    rest.poly([(7, 18), (7, 14), (9, 10), (11, 12), (13, 5), (16, 13), (17, 17), (15, 20), (9, 20)], "#6f4958")
    rest.poly([(8, 17), (9, 12), (11, 15), (13, 7), (16, 14), (16, 18), (14, 19), (10, 19)], "#d98164")
    rest.poly([(10, 18), (11, 15), (12, 15), (13, 12), (15, 17), (14, 19), (11, 19)], "#ffd498")
    rest.dot(10, 6, "#f1ac82")
    rest.dot(16, 4, "#e29477")
    rest.save(objects / "rest.png")

    marker = Sprite()
    marker.ellipse(12, 13, 9, 7, (152, 145, 219, 49))
    marker.poly([(5, 19), (6, 11), (10, 5), (14, 5), (18, 11), (19, 19)], "#45465e")
    marker.poly([(7, 18), (7, 12), (10, 7), (14, 7), (17, 12), (17, 18)], "#77738e")
    marker.line(9, 14, 12, 10, "#dfb5d8")
    marker.line(12, 10, 15, 14, "#dfb5d8")
    marker.line(15, 14, 12, 16, "#c094c5")
    marker.line(12, 16, 9, 14, "#c094c5")
    marker.dot(12, 13, "#f1d3e1")
    marker.save(objects / "marker.png")

    marker_lit = Sprite(24, 24)
    marker_lit.ellipse(12, 12, 8, 8, (143, 126, 212, 52))
    marker_lit.ellipse(12, 12, 5, 5, (182, 161, 227, 84))
    marker_lit.line(12, 6, 12, 18, "#dfc6ec")
    marker_lit.line(6, 12, 18, 12, "#dfc6ec")
    marker_lit.rect(11, 11, 3, 3, "#ffe9ef")
    marker_lit.save(ARCHIVE_ART / "effects" / "firefly.png")



# 角色与敌人
def creatures():
    characters = WORLD_ART / "characters"
    for direction in ("Down", "Up", "Left", "Right"):
        hero = Sprite()
        hero.ellipse(12, 21, 8, 2, (25, 26, 37, 156))
        hero.rect(7, 17, 4, 5, INK)
        hero.rect(13, 17, 4, 5, INK)
        hero.rect(8, 19, 2, 3, "#56505b")
        hero.rect(14, 19, 2, 3, "#56505b")
        hero.poly([(5, 13), (9, 11), (15, 11), (19, 13), (20, 18), (16, 20), (7, 20), (4, 18)], INK)
        hero.poly([(6, 13), (10, 12), (14, 12), (18, 13), (19, 17), (16, 19), (8, 19), (5, 17)], "#32615f")
        hero.rect(7, 14, 2, 4, "#598175")
        hero.rect(16, 14, 2, 4, "#233f46")
        hero.rect(10, 15, 4, 3, "#273f48")
        hero.rect(8, 12, 9, 3, "#983e54")
        hero.rect(10, 13, 6, 1, "#be6670")
        hero.poly([(5, 7), (6, 4), (9, 2), (15, 2), (18, 4), (19, 7), (18, 12), (16, 14), (8, 14), (6, 12)], INK)
        hero.poly([(6, 6), (8, 4), (11, 3), (16, 4), (18, 7), (17, 10), (7, 10)], "#2e2c39")
        hero.rect(8, 5, 7, 1, "#443b46")
        if direction == "Down":
            hero.rect(8, 8, 8, 4, "#d89d80")
            hero.rect(9, 11, 6, 2, "#d29176")
            hero.rect(8, 8, 8, 1, "#251f2b")
            hero.rect(8, 9, 3, 2, "#2a2734")
            hero.rect(13, 9, 3, 2, "#2a2734")
            hero.dot(9, 9, "#9c9da8")
            hero.dot(14, 9, "#9c9da8")
            hero.dot(12, 11, "#ecaf8d")
        elif direction == "Up":
            hero.rect(7, 7, 10, 5, "#2d2a38")
            hero.rect(9, 7, 7, 1, "#3c333e")
            hero.rect(9, 12, 6, 1, "#53404a")
        else:
            side = 9 if direction == "Left" else 13
            hero.rect(side - 1, 8, 6, 4, "#d3967d")
            hero.rect(side - 1, 8, 6, 1, "#292438")
            hero.dot(side, 9, "#a09ba7")
            hero.dot(side + 1, 10, "#f1b08c")
            hero.rect(10 if direction == "Right" else 14, 13, 2, 4, "#9d5062")
        hero.save(characters / f"hero{direction}.png")

    npc = Sprite()
    npc.ellipse(12, 21, 8, 2, (27, 24, 37, 133))
    npc.rect(7, 17, 10, 5, "#2f2c3d")
    npc.poly([(6, 13), (9, 10), (15, 10), (18, 13), (20, 19), (4, 19)], "#4c435c")
    npc.poly([(8, 13), (10, 11), (14, 11), (17, 14), (17, 18), (6, 18)], "#837089")
    npc.rect(11, 13, 2, 5, "#c39886")
    npc.poly([(5, 9), (7, 5), (10, 2), (15, 3), (18, 6), (19, 10), (15, 13), (9, 13)], "#57516d")
    npc.poly([(7, 8), (9, 4), (15, 4), (17, 8), (16, 11), (8, 11)], "#9d91a6")
    npc.rect(8, 8, 8, 4, "#4b445b")
    npc.rect(10, 8, 4, 4, "#bb8d84")
    npc.dot(11, 9, "#f0bd9e")
    npc.rect(19, 9, 1, 11, "#b38a72")
    npc.dot(19, 8, "#d9a294")
    npc.save(characters / "npc.png")

    enemy = Sprite()
    enemy.ellipse(12, 21, 10, 2, (21, 23, 37, 175))
    enemy.poly([(3, 5), (7, 8), (9, 5), (15, 5), (17, 8), (21, 5), (20, 15), (19, 19), (15, 21), (8, 21), (5, 19)], "#29263c")
    enemy.poly([(5, 8), (8, 11), (10, 7), (14, 7), (16, 11), (19, 8), (18, 17), (15, 20), (8, 20), (6, 17)], "#574863")
    enemy.poly([(7, 14), (10, 9), (14, 9), (17, 14), (15, 18), (9, 18)], "#343047")
    enemy.rect(8, 12, 3, 2, "#d47b87")
    enemy.rect(13, 12, 3, 2, "#d47b87")
    enemy.dot(9, 12, "#ffbaa3")
    enemy.dot(14, 12, "#ffbaa3")
    enemy.rect(10, 17, 4, 1, "#8a6684")
    enemy.save(characters / "enemy.png")



# 生成入口
if __name__ == "__main__":
    for draw in (ground, furniture, scenery, artifacts, creatures):
        draw()
