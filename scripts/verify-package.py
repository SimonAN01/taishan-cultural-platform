"""Verify every file distributed in the extracted release package."""
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
manifest = root / 'package-manifest.json'
if not manifest.is_file():
    raise SystemExit('No release manifest; this is a Git checkout, not the release archive.')
files = json.loads(manifest.read_text(encoding='utf-8'))['files']
bad = []
for name, expected in files.items():
    path = root / name
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != expected['sha256']:
        bad.append(name)
print(json.dumps({'files': len(files), 'passed': not bad, 'missing_or_changed': bad}, ensure_ascii=False))
raise SystemExit(bool(bad))
