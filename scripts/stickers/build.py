"""Cut public-domain artwork characters into sticker WebPs for tarot cards (build-time only).

Downloads each source once into .cache/stickers, crops it, lifts the subject with the macOS
Vision framework (lift.swift) and adds a white sticker border with a soft shadow.
Run on macOS 14+: python3 scripts/stickers/build.py
"""
import json, subprocess, sys, urllib.request
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent
CACHE = ROOT / '.cache' / 'stickers'
OUT = ROOT / 'public' / 'art' / 'famous'
SIZE, BORDER = 400, 8

def sticker(lifted: Path, out: Path):
    im = Image.open(lifted).convert('RGBA')
    scale = (SIZE - 2 * BORDER - 20) / max(im.size)
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
    canvas = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    x, y = (SIZE - im.width) // 2, (SIZE - im.height) // 2
    alpha = Image.new('L', (SIZE, SIZE), 0)
    alpha.paste(im.getchannel('A'), (x, y))
    alpha = alpha.point(lambda v: 255 if v > 40 else 0)
    outline = alpha.filter(ImageFilter.MaxFilter(BORDER * 2 + 1)).filter(ImageFilter.GaussianBlur(1))
    shadow = outline.filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.28))
    canvas.paste((0, 0, 0, 255), (0, 5), shadow)
    canvas.paste((255, 255, 255, 255), (0, 0), outline)
    canvas.alpha_composite(im, (x, y))
    canvas.save(out, 'WEBP', quality=82, method=6)

def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    lift = CACHE / 'lift'
    if not lift.exists():
        subprocess.run(['swiftc', '-O', str(HERE / 'lift.swift'), '-o', str(lift)], check=True)
    only = set(sys.argv[1:])
    for item in json.loads((ROOT / 'src' / 'content' / 'famous-art.json').read_text()):
        if only and item['card'] not in only: continue
        source = CACHE / item.get('cached', item['card'] + Path(item['download'].split('?')[0]).suffix)
        if not source.exists():
            request = urllib.request.Request(item['download'], headers={'User-Agent': 'bossdetox-build/1.0'})
            source.write_bytes(urllib.request.urlopen(request, timeout=60).read())
        crop, lifted = CACHE / f"{item['card']}-crop.png", CACHE / f"{item['card']}-lift.png"
        # Busy scenes Vision cannot separate were cut out once with Magnific's background
        # removal; that PNG stays in the cache and is cropped like a source.
        magnific = item.get('cutout') == 'magnific'
        image = Image.open(CACHE / f"{item['card']}-magnific.png" if magnific else source)
        image = image.convert('RGBA' if magnific else 'RGB')
        # Crops are fractions of the source (left, top, right, bottom) so any download size works.
        if item.get('crop'):
            l, t, r, b = item['crop']
            if max(item['crop']) <= 1:
                l, t, r, b = l * image.width, t * image.height, r * image.width, b * image.height
            image = image.crop((round(l), round(t), round(r), round(b)))
        if magnific:
            image.save(lifted := CACHE / f"{item['card']}-lift.png")
            sticker(lifted, OUT / f"{item['card']}.webp")
            print('sticker', item['card'], item['artist'])
            continue
        image.save(crop)
        if subprocess.run([str(lift), str(crop), str(lifted)], stdout=subprocess.DEVNULL).returncode:
            print('NO SUBJECT', item['card'], '(adjust its crop)')
            continue
        sticker(lifted, OUT / f"{item['card']}.webp")
        print('sticker', item['card'], item['artist'])

main()
