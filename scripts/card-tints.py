"""Window and stub colours for the ticket card, taken from each card's sticker art.
Picks the largest hue group outside the warm brown/skin band (0-59°) that covers 10%+ of the
sticker, else the largest; fixed lightness keeps the corner text legible on every tint.
Writes src/content/card-tints.json. Run: python3 scripts/card-tints.py"""
import colorsys
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def tint(path):
    im = Image.open(path).convert('RGBA').resize((120, 120))
    bins = {}
    for r, g, b, a in im.getdata():
        if a < 200:
            continue
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        if v > 0.97 and s < 0.08:  # the white sticker border
            continue
        t = bins.setdefault(int(h * 12) % 12, [0, 0, 0, 0])
        t[0] += r
        t[1] += g
        t[2] += b
        t[3] += 1
    total = sum(t[3] for t in bins.values())
    ranked = sorted(bins.items(), key=lambda kv: -kv[1][3])
    pick = next((t for k, t in ranked if k >= 2 and t[3] / total >= 0.10), ranked[0][1])
    h, _, s = colorsys.rgb_to_hls(*(pick[i] / pick[3] / 255 for i in range(3)))
    s = min(max(s * 1.2, 0.3), 0.6)
    hi, lo, base = (
        '#%02x%02x%02x' % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, light, s))
        for light in (0.92, 0.78, 0.5)
    )
    # The stub: the same hue, stronger, at a lightness that keeps its text at 5:1 or better.
    stub_s = min(max(s * 1.3, 0.4), 0.65)
    stub = shade(h, 0.72, stub_s, INK_DARK, +0.01)
    stub_dark = shade(h, 0.36, stub_s, INK_LIGHT, -0.01)
    return {'hi': hi, 'lo': lo, 'base': base, 'stub': stub, 'stubDark': stub_dark}


INK_DARK, INK_LIGHT = '#26251c', '#edf1e8'


def luminance(hex_):
    c = [int(hex_[i : i + 2], 16) / 255 for i in (1, 3, 5)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def shade(h, light, sat, ink, step):
    # Move lightness away from the ink until the pair reaches 5:1.
    while True:
        hex_ = '#%02x%02x%02x' % tuple(round(c * 255) for c in colorsys.hls_to_rgb(h, light, sat))
        if contrast(hex_, ink) >= 5 or not 0 < light < 1:
            return hex_
        light += step


tints = {p.stem: tint(p) for p in sorted((ROOT / 'public/art/famous').glob('*.webp'))}
(ROOT / 'src/content/card-tints.json').write_text(json.dumps(tints, indent=2) + '\n')
print(len(tints), 'tints')
