"""Build a source + built-frontend archive. Runtime state is never distributed."""
import argparse
import hashlib
import json
import re
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
if not (root / 'dist/index.html').is_file():
    raise SystemExit('Run npm run build first.')
tracked = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
paths = {name: root / name for name in tracked if name}
paths.update({p.relative_to(root).as_posix(): p for p in (root / 'dist').rglob('*') if p.is_file()})
assert all(not any(part in {'.git', 'runtime', 'node_modules', '.venv'} for part in Path(name).parts) for name in paths)
assert 'taishan/config/team.env' in paths
version = re.search(r"^VERSION='([^']+)'", (root / 'taishan/backend/app.py').read_text(), re.M)[1]
dirty = bool(subprocess.check_output(['git', 'status', '--porcelain'], cwd=root))
if dirty:
    raise SystemExit('Commit the complete source first; release archives must match a Git commit.')
manifest = {'version': version, 'date': datetime.now(timezone.utc).isoformat(),
            'source_commit': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root).decode().strip(), 'files': {}}
for name, path in sorted(paths.items()):
    data = path.read_bytes()
    manifest['files'][name] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
args.output.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for name, path in sorted(paths.items()):
        archive.write(path, arcname=f'Taishan-{version}/' + name)
    archive.writestr(f'Taishan-{version}/package-manifest.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
with zipfile.ZipFile(args.output) as archive:
    assert archive.testzip() is None
print(json.dumps({'archive': str(args.output), 'files': len(paths) + 1, 'bytes': args.output.stat().st_size,
                  'sha256': hashlib.sha256(args.output.read_bytes()).hexdigest()}, ensure_ascii=False))
