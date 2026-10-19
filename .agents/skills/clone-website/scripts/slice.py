#!/usr/bin/env python3
"""Slice a scroll=0 fullPage screenshot into per-section reference images.

Usage: python3 slice.py <full-page.png> <outline.json> <out-dir>

outline.json is a list of {tag, cls, y, h, w} objects (the Phase 1 DOM outline,
CSS-pixel coordinates). The screenshot may be at devicePixelRatio > 1; the scale
factor is derived from image width / max section width.
"""
import json
import re
import sys
from pathlib import Path

from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # fullPage captures of long pages exceed the default safety limit


def main():
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    img_path, outline_path, out_dir = sys.argv[1:]
    img = Image.open(img_path)
    sections = json.load(open(outline_path))
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)

    page_w = max((s.get("w") or 0) for s in sections) or img.width
    scale = img.width / page_w

    for i, s in enumerate(sections):
        top = max(0, int(s["y"] * scale))
        bottom = min(img.height, int((s["y"] + s["h"]) * scale))
        if bottom - top < 10:
            continue
        label = re.sub(r"[^a-z0-9]+", "-", (s.get("cls") or s.get("tag", "sec")).lower())[:40].strip("-") or "sec"
        name = f"{i:02d}-{label}.png"
        img.crop((0, top, img.width, bottom)).save(out / name)
        print(f"{name}  y={s['y']} h={s['h']}")


if __name__ == "__main__":
    main()
