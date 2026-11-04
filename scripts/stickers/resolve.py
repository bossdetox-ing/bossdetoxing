"""Find a public-domain/CC0 Commons file for each candidate and cache a 1200px download.

Writes .cache/stickers/resolved.json; review it, then merge into src/content/famous-art.json.
Throttled to stay under Wikimedia's rate limits.
"""
import json, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.cache' / 'stickers'
UA = {'User-Agent': 'bossdetox-build/1.0 (asset research; offline app)'}

def get(url, tries=5):
    for attempt in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as error:
            if error.code != 429: raise
            time.sleep(15 * (attempt + 1))
    raise RuntimeError('rate limited: ' + url)

def search(query):
    params = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'generator': 'search', 'gsrnamespace': '6',
        'gsrsearch': query, 'gsrlimit': '8', 'prop': 'imageinfo',
        'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': '1200'})
    pages = json.loads(get('https://commons.wikimedia.org/w/api.php?' + params)).get('query', {}).get('pages', {})
    ranked = sorted(pages.values(), key=lambda p: p.get('index', 99))
    for page in ranked:
        info = page['imageinfo'][0]
        license = info.get('extmetadata', {}).get('LicenseShortName', {}).get('value', '')
        if info.get('mime') not in ('image/jpeg', 'image/png'): continue
        if not ('Public domain' in license or 'CC0' in license or license == 'PD'): continue
        if info['width'] < 700: continue
        return {'file': info['descriptionurl'], 'download': info.get('thumburl') or info['url'],
                'license': 'CC0' if 'CC0' in license else 'Public domain', 'title': page['title']}
    return None

CACHE.mkdir(parents=True, exist_ok=True)
out_path = CACHE / 'resolved.json'
resolved = json.loads(out_path.read_text()) if out_path.exists() else {}
for card, artist, work, year, query in json.loads((Path(__file__).parent / 'candidates.json').read_text()):
    if card in resolved and (CACHE / resolved[card]['cached']).exists(): continue
    hit = search(query); time.sleep(2)
    if not hit:
        print('MISS', card, query, flush=True); continue
    name = card + ('.png' if hit['download'].split('?')[0].lower().endswith('.png') else '.jpg')
    (CACHE / name).write_bytes(get(hit['download'])); time.sleep(2)
    resolved[card] = {**hit, 'card': card, 'artist': artist, 'work': work, 'year': year, 'cached': name}
    out_path.write_text(json.dumps(resolved, indent=1))
    print('ok', card, '|', hit['title'][5:75], '|', hit['license'], flush=True)
print('done', len(resolved))
