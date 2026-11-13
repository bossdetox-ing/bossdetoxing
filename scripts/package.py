"""Deterministic extension ZIP (Chrome by default, `firefox` as argument). No plaintext user data is included.
Firefox also gets a source ZIP of the repo's tracked files, which Mozilla's reviewers rebuild from."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import hashlib
import json
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
target = sys.argv[1] if len(sys.argv) > 1 else 'chrome'
build = root / '.output' / f'{target}-mv3'
manifest = json.loads((build / 'manifest.json').read_text())
out = root / 'release'
out.mkdir(exist_ok=True)


def pack(archive, files, base):
    with ZipFile(archive, 'w', compression=ZIP_DEFLATED, compresslevel=9) as bundle:
        for path in files:
            info = ZipInfo(path.relative_to(base).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, path.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
    print(f'{archive.relative_to(root)} ({archive.stat().st_size} bytes)')


archive = out / f'bossdetox-ing-{manifest["version"]}-{target}.zip'
pack(archive, sorted(p for p in build.rglob('*') if p.is_file()), build)
if target == 'chrome':
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (out / 'SHA256SUMS').write_text(f'{digest}  {archive.name}\n')
    print(f'SHA256 {digest}')
else:
    listed = subprocess.run(['git', 'ls-files', '-co', '--exclude-standard'], cwd=root,
                            capture_output=True, text=True, check=True).stdout.split('\n')
    files = sorted(root / name for name in listed if name and (root / name).is_file())
    pack(out / f'bossdetox-ing-{manifest["version"]}-source.zip', files, root)
