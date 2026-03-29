#!/usr/bin/env python3
"""Conservative connected-component cleanup for split PNG assets."""
from __future__ import annotations

import argparse
import csv
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Sequence, Tuple

from PIL import Image

SKIP_DIR_KEYWORDS = {
    "ui",
    "encounters/cards",
    "economy/token_family",
}

INCLUDE_DIR_KEYWORDS = {
    "characters",
    "portraits",
    "relics",
    "economy/resources",
    "economy/materials",
    "nodes/icons",
}


@dataclass
class Component:
    cid: int
    area: int
    min_x: int
    min_y: int
    max_x: int
    max_y: int

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        return (self.min_x, self.min_y, self.max_x, self.max_y)

    @property
    def center(self) -> Tuple[float, float]:
        return ((self.min_x + self.max_x) / 2.0, (self.min_y + self.max_y) / 2.0)


@dataclass(frozen=True)
class ThresholdProfile:
    name: str
    keep_area_min: int
    keep_area_ratio: float
    keep_gap_max: float
    keep_near_touch: int
    keep_center_distance: float


DEFAULT_PROFILE = ThresholdProfile(
    name="default",
    keep_area_min=180,
    keep_area_ratio=0.012,
    keep_gap_max=40.0,
    keep_near_touch=48,
    keep_center_distance=170.0,
)

PROFILE_BY_KEYWORD: List[Tuple[str, ThresholdProfile]] = [
    (
        "relics",
        ThresholdProfile(
            name="relics",
            keep_area_min=1200,
            keep_area_ratio=0.025,
            keep_gap_max=28.0,
            keep_near_touch=24,
            keep_center_distance=130.0,
        ),
    ),
    (
        "economy/resources",
        ThresholdProfile(
            name="resources",
            keep_area_min=900,
            keep_area_ratio=0.022,
            keep_gap_max=24.0,
            keep_near_touch=20,
            keep_center_distance=120.0,
        ),
    ),
    (
        "nodes/icons",
        ThresholdProfile(
            name="node_icons",
            keep_area_min=700,
            keep_area_ratio=0.02,
            keep_gap_max=20.0,
            keep_near_touch=18,
            keep_center_distance=115.0,
        ),
    ),
    (
        "economy/materials",
        ThresholdProfile(
            name="materials",
            keep_area_min=850,
            keep_area_ratio=0.02,
            keep_gap_max=24.0,
            keep_near_touch=20,
            keep_center_distance=125.0,
        ),
    ),
]


def relpath_posix(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def find_pngs(root: Path, include_skipped: bool) -> List[Path]:
    files: List[Path] = []
    for p in root.rglob("*.png"):
        rel = p.relative_to(root).as_posix().lower()
        if not include_skipped and any(keyword in rel for keyword in SKIP_DIR_KEYWORDS):
            continue
        if include_skipped:
            files.append(p)
            continue

        if any(keyword in rel for keyword in INCLUDE_DIR_KEYWORDS):
            files.append(p)
    return sorted(files)


def connected_components(alpha: Sequence[int], width: int, height: int, alpha_threshold: int) -> List[Component]:
    visited = bytearray(width * height)
    components: List[Component] = []

    def idx(x: int, y: int) -> int:
        return y * width + x

    directions = [(-1, -1), (0, -1), (1, -1), (-1, 0), (1, 0), (-1, 1), (0, 1), (1, 1)]

    cid = 0
    for y in range(height):
        for x in range(width):
            i = idx(x, y)
            if visited[i] or alpha[i] < alpha_threshold:
                continue
            stack = [(x, y)]
            visited[i] = 1
            area = 0
            min_x = max_x = x
            min_y = max_y = y
            while stack:
                cx, cy = stack.pop()
                area += 1
                min_x = min(min_x, cx)
                min_y = min(min_y, cy)
                max_x = max(max_x, cx)
                max_y = max(max_y, cy)

                for dx, dy in directions:
                    nx, ny = cx + dx, cy + dy
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    ni = idx(nx, ny)
                    if visited[ni] or alpha[ni] < alpha_threshold:
                        continue
                    visited[ni] = 1
                    stack.append((nx, ny))

            components.append(Component(cid=cid, area=area, min_x=min_x, min_y=min_y, max_x=max_x, max_y=max_y))
            cid += 1

    return components


def bbox_edge_distance(a: Component, b: Component) -> float:
    ax1, ay1, ax2, ay2 = a.bbox
    bx1, by1, bx2, by2 = b.bbox

    dx = 0
    if ax2 < bx1:
        dx = bx1 - ax2
    elif bx2 < ax1:
        dx = ax1 - bx2

    dy = 0
    if ay2 < by1:
        dy = by1 - ay2
    elif by2 < ay1:
        dy = ay1 - by2

    return math.hypot(dx, dy)


def expanded_bbox_contains(main: Component, c: Component, margin: int) -> bool:
    mx1, my1, mx2, my2 = main.bbox
    x1 = mx1 - margin
    y1 = my1 - margin
    x2 = mx2 + margin
    y2 = my2 + margin
    cx1, cy1, cx2, cy2 = c.bbox
    return cx1 >= x1 and cy1 >= y1 and cx2 <= x2 and cy2 <= y2


def bboxes_overlap_or_near(main: Component, c: Component, near_touch: int) -> bool:
    mx1, my1, mx2, my2 = main.bbox
    cx1, cy1, cx2, cy2 = c.bbox
    return not (
        (cx2 + near_touch) < mx1
        or (mx2 + near_touch) < cx1
        or (cy2 + near_touch) < my1
        or (my2 + near_touch) < cy1
    )


def center_distance(main: Component, c: Component) -> float:
    mcx, mcy = main.center
    ccx, ccy = c.center
    return math.hypot(ccx - mcx, ccy - mcy)


def profile_for_relpath(asset_path_hint: str, args: argparse.Namespace) -> ThresholdProfile:
    rel = asset_path_hint.lower()
    for key, profile in PROFILE_BY_KEYWORD:
        if key in rel:
            return profile
    return ThresholdProfile(
        name="custom_default",
        keep_area_min=args.keep_area_min,
        keep_area_ratio=args.keep_area_ratio,
        keep_gap_max=args.keep_near_distance,
        keep_near_touch=args.keep_margin,
        keep_center_distance=args.keep_center_distance,
    )


def is_likely_noise(c: Component, main: Component, profile: ThresholdProfile) -> Tuple[bool, str]:
    if c.cid == main.cid:
        return False, "main"

    area_ratio = c.area / max(main.area, 1)
    gap = bbox_edge_distance(main, c)
    ctr_dist = center_distance(main, c)

    if c.area >= profile.keep_area_min:
        return False, f"keep_area:{c.area}>={profile.keep_area_min}"

    if area_ratio >= profile.keep_area_ratio:
        return False, f"keep_ratio:{area_ratio:.5f}>={profile.keep_area_ratio}"

    if bboxes_overlap_or_near(main, c, profile.keep_near_touch):
        return False, f"keep_near_bbox:near_touch={profile.keep_near_touch}"

    if gap <= profile.keep_gap_max:
        return False, f"keep_near_main:gap={gap:.0f}"

    if expanded_bbox_contains(main, c, profile.keep_near_touch):
        return False, f"keep_inside_margin:{profile.keep_near_touch}px"

    if ctr_dist <= profile.keep_center_distance:
        return False, f"keep_center_near:{ctr_dist:.1f}<={profile.keep_center_distance}"

    small_area = c.area < profile.keep_area_min
    small_ratio = area_ratio < profile.keep_area_ratio
    far_from_main = gap > profile.keep_gap_max

    if small_area and small_ratio and far_from_main:
        return True, f"remove_small_far: area={c.area} ratio={area_ratio:.4f} gap={gap:.0f}"

    return False, f"keep_extension_candidate: area={c.area} ratio={area_ratio:.4f} gap={gap:.0f} center={ctr_dist:.1f}"


def remove_components(alpha: Sequence[int], width: int, components: Sequence[Component], remove_ids: set[int]) -> bytes:
    mutable = bytearray(alpha)
    index_to_component: Dict[Tuple[int, int], int] = {}

    # rebuild map with bbox checks for efficiency fallback
    for c in components:
        for y in range(c.min_y, c.max_y + 1):
            row_off = y * width
            for x in range(c.min_x, c.max_x + 1):
                i = row_off + x
                if alpha[i] > 0:
                    index_to_component[(x, y)] = c.cid

    for (x, y), cid in index_to_component.items():
        if cid in remove_ids:
            mutable[y * width + x] = 0
    return bytes(mutable)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def process_png(path: Path, input_root: Path, output_root: Path, args: argparse.Namespace) -> Dict[str, object]:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    channels = image.split()
    alpha = channels[3].tobytes()
    alpha_values = list(alpha)

    comps = connected_components(alpha_values, width, height, args.alpha_threshold)
    rel = relpath_posix(path, input_root)
    profile = profile_for_relpath(path.as_posix(), args)

    if not comps:
        dest = path if args.in_place else (output_root / rel)
        if not args.dry_run and not args.in_place:
            ensure_parent(dest)
            image.save(dest)
        return {
            "file": rel,
            "components_found": 0,
            "removed_components": 0,
            "removed_sizes": [],
            "kept_sizes": [],
            "changed": False,
            "output_file": str(dest),
        }

    main = max(comps, key=lambda c: c.area)

    remove_ids: set[int] = set()
    removed_sizes: List[int] = []
    kept_sizes: List[int] = []
    decisions: List[Dict[str, object]] = []

    for c in comps:
        remove, reason = is_likely_noise(c, main, profile)
        if remove:
            remove_ids.add(c.cid)
            removed_sizes.append(c.area)
        else:
            kept_sizes.append(c.area)
        decisions.append({
            "id": c.cid,
            "area": c.area,
            "bbox": [c.min_x, c.min_y, c.max_x, c.max_y],
            "area_ratio": round(c.area / max(main.area, 1), 6),
            "gap_to_main_bbox": round(bbox_edge_distance(main, c), 3),
            "center_distance": round(center_distance(main, c), 3),
            "profile": profile.name,
            "remove": remove,
            "reason": reason,
        })

    changed = bool(remove_ids)
    dest = path if args.in_place else (output_root / rel)

    if changed and not args.dry_run:
        new_alpha = remove_components(alpha_values, width, comps, remove_ids)
        cleaned = Image.merge("RGBA", (channels[0], channels[1], channels[2], Image.frombytes("L", (width, height), new_alpha)))
        ensure_parent(dest)
        cleaned.save(dest)
    elif not changed and not args.dry_run and not args.in_place:
        ensure_parent(dest)
        image.save(dest)

    return {
        "file": rel,
        "components_found": len(comps),
        "removed_components": len(remove_ids),
        "removed_sizes": sorted(removed_sizes),
        "kept_sizes": sorted(kept_sizes, reverse=True),
        "changed": changed,
        "output_file": str(dest),
        "threshold_profile": profile.name,
        "component_decisions": decisions,
    }


def write_reports(results: List[Dict[str, object]], report_base: Path) -> Tuple[Path, Path]:
    report_base.parent.mkdir(parents=True, exist_ok=True)
    json_path = report_base.with_suffix(".json")
    csv_path = report_base.with_suffix(".csv")

    with json_path.open("w", encoding="utf-8") as jf:
        json.dump(results, jf, indent=2)

    with csv_path.open("w", encoding="utf-8", newline="") as cf:
        writer = csv.DictWriter(
            cf,
            fieldnames=[
                "file",
                "components_found",
                "removed_components",
                "removed_sizes",
                "kept_sizes",
                "changed",
                "output_file",
            ],
        )
        writer.writeheader()
        for r in results:
            writer.writerow(
                {
                    "file": r["file"],
                    "components_found": r["components_found"],
                    "removed_components": r["removed_components"],
                    "removed_sizes": "|".join(map(str, r["removed_sizes"])),
                    "kept_sizes": "|".join(map(str, r["kept_sizes"])),
                    "changed": r["changed"],
                    "output_file": r["output_file"],
                }
            )
    return json_path, csv_path


def create_contact_sheet(results: List[Dict[str, object]], input_root: Path, output_root: Path, preview_path: Path, max_items: int = 25) -> Path | None:
    changed = [r for r in results if r.get("changed")]
    if not changed:
        return None

    pairs = changed[:max_items]
    sample_panels: List[Image.Image] = []
    panel_h = 0
    panel_w = 0
    for item in pairs:
        src = input_root / item["file"]
        dst = Path(item["output_file"])
        if not dst.exists() and output_root:
            candidate = output_root / item["file"]
            if candidate.exists():
                dst = candidate
        if not src.exists() or not dst.exists():
            continue

        before = Image.open(src).convert("RGBA")
        after = Image.open(dst).convert("RGBA")
        height = max(before.height, after.height)
        width = before.width + after.width + 8
        panel = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        panel.paste(before, (0, 0))
        panel.paste(after, (before.width + 8, 0))
        sample_panels.append(panel)
        panel_h = max(panel_h, height)
        panel_w = max(panel_w, width)

    if not sample_panels:
        return None

    cols = 2
    rows = math.ceil(len(sample_panels) / cols)
    sheet = Image.new("RGBA", (panel_w * cols, panel_h * rows), (255, 255, 255, 0))
    for i, panel in enumerate(sample_panels):
        r = i // cols
        c = i % cols
        sheet.paste(panel, (c * panel_w, r * panel_h))

    preview_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(preview_path)
    return preview_path


def parse_args() -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Clean disconnected stray PNG components conservatively.")
    ap.add_argument("--input-dir", required=True)
    ap.add_argument("--output-dir", required=True)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--in-place", action="store_true")
    ap.add_argument("--include-skipped", action="store_true", help="Include dirs normally skipped by default.")
    ap.add_argument("--alpha-threshold", type=int, default=16)

    # Conservative keep heuristics
    ap.add_argument("--keep-area-min", type=int, default=180)
    ap.add_argument("--keep-area-ratio", type=float, default=0.012)
    ap.add_argument("--keep-margin", type=int, default=48)
    ap.add_argument("--keep-near-distance", type=float, default=40.0)
    ap.add_argument("--keep-center-distance", type=float, default=170.0)

    ap.add_argument("--report-base", default="")
    ap.add_argument("--preview-sheet", default="")
    return ap.parse_args()


def main() -> int:
    args = parse_args()
    input_root = Path(args.input_dir).resolve()
    output_root = Path(args.output_dir).resolve()

    if not input_root.exists() or not input_root.is_dir():
        raise SystemExit(f"Input directory does not exist: {input_root}")

    pngs = find_pngs(input_root, include_skipped=args.include_skipped)
    results: List[Dict[str, object]] = []

    for p in pngs:
        res = process_png(p, input_root, output_root, args)
        results.append(res)
        print(
            f"{res['file']}: components={res['components_found']} removed={res['removed_components']} changed={res['changed']}"
        )

    report_base = Path(args.report_base) if args.report_base else (
        output_root / "cleanup_report" if not args.in_place else input_root / "cleanup_report"
    )
    json_path, csv_path = write_reports(results, report_base)

    print(f"\nProcessed files: {len(results)}")
    print(f"Changed files: {sum(1 for r in results if r['changed'])}")
    print(f"Report JSON: {json_path}")
    print(f"Report CSV: {csv_path}")

    if args.preview_sheet and not args.dry_run:
        preview = create_contact_sheet(results, input_root, output_root, Path(args.preview_sheet))
        if preview:
            print(f"Preview sheet: {preview}")
        else:
            print("Preview sheet: no changed files to preview")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
