"""Deterministic Chrome unpacked ZIP. No plaintext user data is included."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json

root = Path(__file__).resolve().parents[1]
build = root / '.output' / 'chrome-mv3'
manifest = json.loads((build / 'manifest.json').read_text())
out = root / 'release'
out.mkdir(exist_ok=True)
archive = out / f'bossdetox-ing-{manifest["version"]}-chrome.zip'
with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
    for path in sorted(build.rglob('*')):
        if path.is_file():
            info = ZipInfo(path.relative_to(build).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
print(f'{archive.relative_to(root)} ({archive.stat().st_size} bytes)\nSHA256 {digest}')
