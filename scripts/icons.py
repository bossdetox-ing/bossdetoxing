"""Generate original toolbar icons from simple geometric primitives, offline."""
from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parents[1] / 'public' / 'icons'
out.mkdir(parents=True, exist_ok=True)
for kind in ['search', 'notes', 'sigil']:
    for size in [16, 32, 48, 128]:
        scale = size * 4 / 24
        im = Image.new('RGBA', (size * 4, size * 4), (0, 0, 0, 0))
        draw = ImageDraw.Draw(im)
        color = (142, 125, 87, 255)
        width = max(1, round(1.8 * scale))
        def line(points):
            draw.line([(round(x*scale),round(y*scale)) for x,y in points], fill=color, width=width, joint='curve')
        def ellipse(box):
            draw.ellipse(tuple(round(v*scale) for v in box), outline=color, width=width)
        if kind == 'search':
            ellipse([4, 4, 16, 16]); line([(14,14),(21,21)])
        elif kind == 'notes':
            line([(6,3),(18,3),(18,21),(6,21),(6,3)])
            line([(9,8),(15,8)]); line([(9,12),(15,12)]); line([(9,16),(13,16)])
        else:
            ellipse([3,3,21,21]); line([(12,4),(12,20)]); line([(5,16),(12,7),(19,16),(5,16)])
        im.resize((size,size), Image.Resampling.LANCZOS).save(out / f'{kind}{size}.png')
