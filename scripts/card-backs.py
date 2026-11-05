"""Card-back wallpaper for the clandrei trial: eight of the logo avatars in brick rows, lime over
sage, each tilted a little. Writes public/art/backs/monkeys.svg. Run: python3 scripts/card-backs.py"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AVATARS = ROOT / 'public/avatars'
OUT = ROOT / 'public/art/backs/monkeys.svg'


def path(n):
    return re.search(r' d="([^"]+)"', (AVATARS / f'{n:02d}.svg').read_text()).group(1)


scale = 40 / 197  # avatars are 197 wide; each monkey is 40 units in a 200 x 100 tile
rows = [
    (25, [(25, 2, -8), (75, 9, 6), (125, 16, -4), (175, 23, 9)], '#bef000', 1),
    # The outer two are one monkey split across the tile edge, so the rows tile seamlessly.
    (75, [(0, 5, 7), (50, 12, -6), (100, 19, 5), (150, 27, -9), (200, 5, 7)], '#edf1e8', 0.5),
]
parts = [
    f'<g transform="translate({x} {y}) rotate({turn}) scale({scale:.4f}) translate(-98.5 -87.5)" '
    f'fill="{fill}" fill-opacity="{opacity}"><path d="{path(n)}"/></g>'
    for y, items, fill, opacity in rows
    for x, n, turn in items
]
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100" '
    f'shape-rendering="crispEdges">{"".join(parts)}</svg>\n'
)
print(OUT.relative_to(ROOT))
