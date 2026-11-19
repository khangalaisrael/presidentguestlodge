"""Generate the site's images from the originals in assets/.

Run from the repo root:  python3 scripts/optimize_images.py

For every photo in assets/photos/ it writes two WebP files to img/:
  img/<name>.webp    long side 1600px  (desktop)
  img/<name>-m.webp  long side 800px   (phones)
It also cuts the red logo disc out of assets/logo-source.jpg
(img/logo.webp, img/favicon.png) and makes the link preview img/og.jpg.

Requires Pillow and numpy:  pip install pillow numpy
"""
import os
import re

import numpy as np
from PIL import Image, ImageDraw, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PHOTOS = os.path.join(ROOT, "assets", "photos")
OUT = os.path.join(ROOT, "img")

LARGE, SMALL = 1600, 800
QUALITY_LARGE, QUALITY_SMALL = 70, 66
OG_SOURCE = "Lappa & swimming Pool.jpg"


def slug(filename: str) -> str:
    """'Lappa & swimming Pool.jpg' -> 'lappa-swimming-pool'"""
    stem = os.path.splitext(filename)[0].lower()
    return re.sub(r"[^a-z0-9]+", "-", stem).strip("-")


def load(path: str) -> Image.Image:
    """Open a photo upright (respecting EXIF rotation) in RGB."""
    return ImageOps.exif_transpose(Image.open(path)).convert("RGB")


def save_webp(img: Image.Image, long_side: int, quality: int, dest: str) -> None:
    copy = img.copy()
    copy.thumbnail((long_side, long_side), Image.LANCZOS)
    copy.save(dest, "WEBP", quality=quality, method=6)


def photos() -> None:
    for filename in sorted(os.listdir(PHOTOS)):
        if not filename.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
            continue
        img = load(os.path.join(PHOTOS, filename))
        name = slug(filename)
        save_webp(img, LARGE, QUALITY_LARGE, os.path.join(OUT, f"{name}.webp"))
        save_webp(img, SMALL, QUALITY_SMALL, os.path.join(OUT, f"{name}-m.webp"))
        print(f"photo  {filename} -> img/{name}.webp, img/{name}-m.webp")


def logo() -> None:
    """Find the red disc in the logo artwork and cut it out as a circle."""
    img = Image.open(os.path.join(ROOT, "assets", "logo-source.jpg")).convert("RGB")
    px = np.array(img).astype(int)
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    red = (r > 120) & (g < 80) & (b < 80)
    ys, xs = np.where(red[: img.height // 2])  # the disc sits in the top half
    cx, cy = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2
    radius = max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 2
    disc = img.crop((int(cx - radius), int(cy - radius), int(cx + radius), int(cy + radius)))
    disc = disc.resize((240, 240), Image.LANCZOS).convert("RGBA")
    mask = Image.new("L", (960, 960), 0)
    ImageDraw.Draw(mask).ellipse((4, 4, 955, 955), fill=255)
    disc.putalpha(mask.resize((240, 240), Image.LANCZOS))
    disc.resize((112, 112), Image.LANCZOS).save(os.path.join(OUT, "logo.webp"), "WEBP", quality=85)
    disc.resize((64, 64), Image.LANCZOS).save(os.path.join(OUT, "favicon.png"), optimize=True)
    print("logo   assets/logo-source.jpg -> img/logo.webp, img/favicon.png")


def og_image() -> None:
    """1200x630 crop for link previews (WhatsApp, Facebook, etc.)."""
    img = load(os.path.join(PHOTOS, OG_SOURCE))
    w, h = img.size
    crop_h = int(w * 630 / 1200)
    top = int((h - crop_h) * 0.6)
    img = img.crop((0, top, w, top + crop_h)).resize((1200, 630), Image.LANCZOS)
    img.save(os.path.join(OUT, "og.jpg"), "JPEG", quality=80)
    print("og     img/og.jpg")


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    photos()
    logo()
    og_image()
