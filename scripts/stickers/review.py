"""Contact sheet for reviewing stickers: source thumbnail beside its sticker (dev only)."""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.cache' / 'stickers'
items = json.loads((ROOT / 'src' / 'content' / 'famous-art.json').read_text())
cards = sys.argv[2:] or [i['card'] for i in items]
out = Path(sys.argv[1])
cell = 190
sheet = Image.new('RGB', (4 * 2 * cell, ((len(cards) + 3) // 4) * (cell + 18)), (242, 241, 236))
draw = ImageDraw.Draw(sheet)
for n, card in enumerate(cards):
    item = next(i for i in items if i['card'] == card)
    x, y = (n % 4) * 2 * cell, (n // 4) * (cell + 18)
    src = Image.open(CACHE / item.get('cached', card + Path(item['download'].split('?')[0]).suffix)).convert('RGB')
    src.thumbnail((cell - 6, cell - 6)); sheet.paste(src, (x + 3, y + 3))
    sticker = ROOT / 'public' / 'art' / 'famous' / f'{card}.webp'
    if sticker.exists():
        s = Image.open(sticker).convert('RGBA'); s.thumbnail((cell - 6, cell - 6)); sheet.paste(s, (x + cell + 3, y + 3), s)
    draw.text((x + 4, y + cell + 2), f"{card} {item['work'][:28]}", fill=(0, 0, 0))
sheet.save(out)
