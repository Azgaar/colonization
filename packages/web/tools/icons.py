# The app icons for the manifest and home screens, drawn from favicon.svg's shapes: the gold compass star on the blue of the open sea.
# Usage: uv run --with pillow python packages/web/tools/icons.py   (writes packages/web/icons/)
import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')
SEA, GOLD, SHADE = (24, 84, 128), (237, 180, 67), (168, 116, 28)
SS = 4  # drawn at four times the size, then scaled down for smooth edges


def icon(size: int, full: bool, scale: float) -> Image.Image:
    """`full`: the sea fills the square (home screens round or mask it); else a rounded tile as the favicon. `scale`: the star's share of the square."""
    n = size * SS
    im = Image.new('RGBA', (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if full:
        d.rectangle([0, 0, n, n], fill=SEA)
    else:
        d.rounded_rectangle([0, 0, n - 1, n - 1], radius=n * 14 / 64, fill=SEA)
    k = n * scale / 54  # the star spans 54 of the favicon's 64 units
    c = n / 2
    p = lambda x, y: (c + (x - 32) * k, c + (y - 32) * k)
    r = 18 * k
    d.ellipse([c - r, c - r, c + r, c + r], outline=GOLD, width=max(1, round(3 * k)))
    d.polygon([p(32, 5), p(37.5, 26.5), p(59, 32), p(37.5, 37.5), p(32, 59), p(26.5, 37.5), p(5, 32), p(26.5, 26.5)], fill=GOLD)
    for tri in ([(32, 5), (37.5, 26.5), (32, 32)], [(59, 32), (37.5, 37.5), (32, 32)], [(32, 59), (26.5, 37.5), (32, 32)], [(5, 32), (26.5, 26.5), (32, 32)]):
        d.polygon([p(*q) for q in tri], fill=SHADE)
    r = 2.6 * k
    d.ellipse([c - r, c - r, c + r, c + r], fill=SEA)
    return im.resize((size, size), Image.LANCZOS)


os.makedirs(OUT, exist_ok=True)
for name, size, full, scale in [
    ('icon-192.png', 192, False, 54 / 64),
    ('icon-512.png', 512, False, 54 / 64),
    # Maskable: the star stays inside the middle 80% that every mask keeps.
    ('maskable-512.png', 512, True, 0.66),
    ('apple-touch-icon.png', 180, True, 0.72),
]:
    img = icon(size, full, scale)
    (img.convert('RGB') if full else img).save(os.path.join(OUT, name), optimize=True)
    print(name)
