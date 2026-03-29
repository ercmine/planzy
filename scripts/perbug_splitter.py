#!/usr/bin/env python3
import csv
import json
import math
import os
import re
import sys
from collections import Counter, deque
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple

from PIL import Image

RGBA = Tuple[int, int, int, int]


def fail(msg: str) -> None:
    raise SystemExit(f"[ERROR] {msg}")


def slugify(text: str) -> str:
    text = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    return re.sub(r"_+", "_", text)


def border_pixels(img: Image.Image) -> List[Tuple[int, int, int]]:
    w, h = img.size
    px = img.load()
    out = []
    for x in range(w):
        out.append(px[x, 0][:3])
        out.append(px[x, h - 1][:3])
    for y in range(h):
        out.append(px[0, y][:3])
        out.append(px[w - 1, y][:3])
    return out


def estimate_bg(img: Image.Image) -> Tuple[int, int, int]:
    vals = border_pixels(img)
    rs = sorted(v[0] for v in vals)
    gs = sorted(v[1] for v in vals)
    bs = sorted(v[2] for v in vals)
    m = len(vals) // 2
    return rs[m], gs[m], bs[m]


def color_dist(a, b):
    return math.sqrt(sum((int(a[i]) - int(b[i])) ** 2 for i in range(3)))


def flood_remove_bg(cell: Image.Image, mode: str) -> Image.Image:
    im = cell.copy().convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = estimate_bg(im)

    # Tuned: light-sheet modes need tighter threshold than darker sheets.
    base_tol = 34 if mode in {"material", "token_family"} else 28
    q = deque()
    seen = [[False] * w for _ in range(h)]
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))

    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        r, g, b, a = px[x, y]
        if a == 0:
            continue
        dist = color_dist((r, g, b), bg)
        lum = (r + g + b) / 3
        bg_lum = sum(bg) / 3
        lum_ok = abs(lum - bg_lum) <= (24 if mode in {"material", "token_family"} else 18)
        if dist <= base_tol and lum_ok:
            px[x, y] = (r, g, b, 0)
            q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    return im


def alpha_bbox(im: Image.Image):
    return im.getbbox()


def trim_with_margin(im: Image.Image, margin: int, min_canvas: int = 1, square: bool = True) -> Image.Image:
    bbox = alpha_bbox(im)
    if bbox is None:
        return Image.new("RGBA", (min_canvas, min_canvas), (0, 0, 0, 0))
    crop = im.crop(bbox)
    cw, ch = crop.size
    if square:
        side = max(min_canvas, max(cw, ch) + margin * 2)
        out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        out.alpha_composite(crop, ((side - cw) // 2, (side - ch) // 2))
    else:
        out = Image.new("RGBA", (max(min_canvas, cw + margin * 2), max(min_canvas, ch + margin * 2)), (0, 0, 0, 0))
        out.alpha_composite(crop, (margin, margin))
    return out


def remove_small_islands(im: Image.Image, min_area: int) -> Image.Image:
    w, h = im.size
    px = im.load()
    solid = [[px[x, y][3] > 0 for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    kept = [[False] * w for _ in range(h)]
    for y in range(h):
        for x in range(w):
            if not solid[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)])
            seen[y][x] = True
            comp = []
            while q:
                cx, cy = q.popleft()
                comp.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1), (cx + 1, cy + 1), (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and solid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True
                        q.append((nx, ny))
            if len(comp) >= min_area:
                for cx, cy in comp:
                    kept[cy][cx] = True
    out = im.copy()
    opx = out.load()
    for y in range(h):
        for x in range(w):
            if not kept[y][x]:
                r, g, b, a = opx[x, y]
                opx[x, y] = (r, g, b, 0)
    return out


def split_grid(img: Image.Image, cols: int, rows: int):
    w, h = img.size
    if w % cols != 0 or h % rows != 0:
        fail(f"Image dimensions {w}x{h} not divisible by grid {cols}x{rows}")
    cw, ch = w // cols, h // rows
    for y in range(rows):
        for x in range(cols):
            yield x, y, img.crop((x * cw, y * ch, (x + 1) * cw, (y + 1) * ch))


def rarity_from_density(im: Image.Image) -> str:
    bbox = im.getbbox()
    if not bbox:
        return "common"
    w, h = im.size
    px = im.load()
    filled = sum(1 for y in range(h) for x in range(w) if px[x, y][3] > 0)
    ratio = filled / max(1, w * h)
    if ratio < 0.10:
        return "common"
    if ratio < 0.16:
        return "uncommon"
    if ratio < 0.24:
        return "rare"
    if ratio < 0.35:
        return "epic"
    if ratio < 0.48:
        return "legendary"
    return "mythic"


def write_image(img: Image.Image, out_path: Path, upscale: int | None = None):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    if upscale:
        img = img.resize((upscale, upscale), Image.Resampling.NEAREST)
    img.save(out_path)


def process_character(mode, role, input_path, output_dir, upscale, grid=8):
    img = Image.open(input_path).convert("RGBA")
    rows = []
    idx = 0
    for gx, gy, cell in split_grid(img, grid, grid):
        idx += 1
        keyed = flood_remove_bg(cell, mode)
        cleaned = remove_small_islands(keyed, min_area=max(4, int(cell.size[0] * cell.size[1] * 0.0025)))
        framed = trim_with_margin(cleaned, margin=max(8, int(min(cell.size) * 0.10)), min_canvas=64, square=True)
        rarity = rarity_from_density(cleaned)
        name = f"{role}_{idx:03d}"
        filename = f"{idx:03d}_{rarity}_{name}.png"
        write_image(framed, Path(output_dir) / filename, upscale=upscale)
        rows.append({"index": idx, "grid_x": gx, "grid_y": gy, "filename": filename, "rarity": rarity, "name": name, "role": role})
    meta = Path(output_dir) / f"perbug_{role}_metadata.csv"
    with meta.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def process_named_grid(mode, input_path, output_dir, cols, rows, names, square=True, margin_ratio=0.12, min_canvas=96):
    img = Image.open(input_path).convert("RGBA")
    cells = list(split_grid(img, cols, rows))
    if len(cells) != len(names):
        fail(f"Name count {len(names)} does not match grid count {len(cells)}")
    for i, (_x, _y, cell) in enumerate(cells):
        keyed = flood_remove_bg(cell, mode)
        cleaned = remove_small_islands(keyed, min_area=max(2, int(cell.size[0] * cell.size[1] * 0.0012)))
        margin = max(8, int(min(cell.size) * margin_ratio))
        framed = trim_with_margin(cleaned, margin=margin, min_canvas=min_canvas, square=square)
        write_image(framed, Path(output_dir) / names[i])


def process_relics(input_path, output_dir, upscale):
    img = Image.open(input_path).convert("RGBA")
    grid = 8
    idx = 0
    rows = []
    prefix = slugify(Path(input_path).stem)
    for gx, gy, cell in split_grid(img, grid, grid):
        idx += 1
        keyed = flood_remove_bg(cell, "relic")
        cleaned = remove_small_islands(keyed, min_area=max(3, int(cell.size[0] * cell.size[1] * 0.0018)))
        framed = trim_with_margin(cleaned, margin=max(10, int(min(cell.size) * 0.12)), min_canvas=80, square=True)
        filename = f"{prefix}_{idx:03d}.png"
        write_image(framed, Path(output_dir) / filename, upscale=upscale)
        rows.append({"index": idx, "grid_x": gx, "grid_y": gy, "filename": filename})
    with (Path(output_dir) / f"{prefix}_metadata.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def process_material(input_path, output_dir, upscale):
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    grid = 16 if w % 16 == 0 and h % 16 == 0 else 8
    idx = 0
    rows = []
    for gx, gy, cell in split_grid(img, grid, grid):
        idx += 1
        keyed = flood_remove_bg(cell, "material")
        cleaned = remove_small_islands(keyed, min_area=max(2, int(cell.size[0] * cell.size[1] * 0.0015)))
        framed = trim_with_margin(cleaned, margin=max(6, int(min(cell.size) * 0.10)), min_canvas=72, square=True)
        filename = f"{idx:03d}_material.png"
        write_image(framed, Path(output_dir) / filename, upscale=upscale)
        rows.append({"index": idx, "grid_x": gx, "grid_y": gy, "filename": filename})
    with (Path(output_dir) / "perbug_material_metadata.csv").open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader(); w.writerows(rows)


def process_token_family(input_path, output_dir):
    img = flood_remove_bg(Image.open(input_path).convert("RGBA"), "token_family")
    img = remove_small_islands(img, min_area=120)
    w, h = img.size
    px = img.load()
    solid = [[px[x, y][3] > 0 for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    comps = []
    for y in range(h):
        for x in range(w):
            if not solid[y][x] or seen[y][x]:
                continue
            q = deque([(x, y)]); seen[y][x] = True
            pts = []
            minx = maxx = x; miny = maxy = y
            while q:
                cx, cy = q.popleft(); pts.append((cx, cy))
                minx, maxx = min(minx, cx), max(maxx, cx)
                miny, maxy = min(miny, cy), max(maxy, cy)
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1), (cx + 1, cy + 1), (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h and solid[ny][nx] and not seen[ny][nx]:
                        seen[ny][nx] = True; q.append((nx, ny))
            if len(pts) >= 250:
                comps.append((minx, miny, maxx + 1, maxy + 1, len(pts)))
    comps.sort(key=lambda c: (c[1], c[0]))
    if not comps:
        fail("No token-family components detected")
    for i, (l, t, r, b, _a) in enumerate(comps, 1):
        crop = img.crop((l, t, r, b))
        framed = trim_with_margin(crop, margin=max(10, int(min(crop.size) * 0.18)), min_canvas=128, square=True)
        write_image(framed, Path(output_dir) / f"perbug_token_icon_{i:02d}.png")


def main():
    if len(sys.argv) < 5:
        fail("Usage: perbug_splitter.py MODE IMAGE OUTPUT_DIR UPSCALE")
    mode, image_name, output_dir, upscale_s = sys.argv[1:5]
    upscale = int(upscale_s) if upscale_s != "0" else None
    if not Path(image_name).exists():
        fail(f"Missing source image: {image_name}")
    Path(output_dir).mkdir(parents=True, exist_ok=True)

    if mode in {"warrior", "assassin", "caster", "cleric", "engineer", "scout", "support", "tank"}:
        process_character(mode, mode, image_name, output_dir, upscale or 512, grid=8)
    elif mode == "portraits":
        process_named_grid(mode, image_name, output_dir, 4, 2, [
            "portrait_tank.png", "portrait_scout.png", "portrait_caster.png", "portrait_support.png",
            "portrait_cleric.png", "portrait_assassin.png", "portrait_engineer.png", "portrait_warrior.png",
        ], square=True, margin_ratio=0.14, min_canvas=256)
    elif mode == "icons":
        process_named_grid(mode, image_name, output_dir, 4, 2, ["encounter.png", "resource.png", "mission.png", "shop.png", "rare.png", "boss.png", "rest.png", "event.png"], square=True, margin_ratio=0.16, min_canvas=96)
    elif mode == "node_tiles":
        process_named_grid(mode, image_name, output_dir, 4, 2, [
            "node_encounter.png", "node_resource.png", "node_mission.png", "node_shop.png",
            "node_rare.png", "node_boss.png", "node_rest.png", "node_event.png",
        ], square=True, margin_ratio=0.12, min_canvas=128)
    elif mode == "encounter_cards":
        process_named_grid(mode, image_name, output_dir, 4, 2, [
            "encounter_puzzle.png", "encounter_battle.png", "encounter_mission.png", "encounter_anomaly.png",
            "encounter_treasure.png", "encounter_boss.png", "encounter_event.png", "encounter_escape.png",
        ], square=False, margin_ratio=0.08, min_canvas=160)
    elif mode == "resources":
        process_named_grid(mode, image_name, output_dir, 4, 2, [
            "resource_ore.png", "resource_crystal.png", "resource_bio_matter.png", "resource_perbug_token.png",
            "resource_relic_fragments.png", "resource_signal_shards.png", "resource_fuel.png", "resource_perbug_energy.png",
        ], square=True, margin_ratio=0.15, min_canvas=192)
    elif mode == "relics":
        process_relics(image_name, output_dir, upscale or 512)
    elif mode == "material":
        process_material(image_name, output_dir, upscale or 512)
    elif mode == "token_family":
        process_token_family(image_name, output_dir)
    else:
        fail(f"Unknown mode: {mode}")
    print(f"[OK] Mode {mode} complete: {output_dir}")


if __name__ == "__main__":
    main()
