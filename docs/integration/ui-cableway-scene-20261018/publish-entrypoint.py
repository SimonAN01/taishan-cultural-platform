"""Run on the existing Tencent host after publishing the verified frontend."""
from pathlib import Path
import datetime
import json
import shutil
import subprocess

configs = [Path('/etc/nginx/conf.d/taishan.conf'), Path('/etc/nginx/conf.d/taishan-https.conf')]
block = r'''    # Only the Word interface remains public. Retire legacy page bundles.
    location = / {
        add_header Cache-Control "no-store" always;
        return 302 /experience/$is_args$args;
    }
    location = /index.html {
        add_header Cache-Control "no-store" always;
        return 302 /experience/$is_args$args;
    }
    location = /classic {
        return 302 /experience/$is_args$args;
    }
    location ^~ /classic/ {
        return 302 /experience/$is_args$args;
    }
    location ~ ^/(app\.js|map\.js|ui\.js|assistant\.js|style\.css)$ {
        add_header Cache-Control "no-store" always;
        return 410;
    }
'''
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d-%H%M%S')
backup = Path('/opt/taishan/runtime') / ('entrypoint-before-' + stamp)
backup.mkdir()
originals = {path: path.read_bytes() for path in configs}
for path in configs:
    shutil.copy2(path, backup / path.name)
try:
    for path, data in originals.items():
        text = data.decode()
        if 'location = / {' in text:
            raise RuntimeError('An existing exact root handler requires review: ' + str(path))
        if text.count('    location / {') != 1:
            raise RuntimeError('Unexpected routing structure: ' + str(path))
        updated = text.replace('    location / {', block + '    location / {', 1)
        path.write_text(updated)
    subprocess.run(['nginx', '-t'], check=True)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=True)
except Exception:
    for path, data in originals.items():
        path.write_bytes(data)
    subprocess.run(['nginx', '-t'], check=False)
    subprocess.run(['systemctl', 'reload', 'nginx'], check=False)
    raise
result = {'updated_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
          'root_redirect': '/experience/', 'legacy_ui_retired': True, 'legacy_bundles_status': 410,
          'query_preserved': True, 'backup': str(backup),
          'nginx_config_test': True, 'nginx_reloaded': True,
          'backend_changed': False, 'database_changed': False}
Path('/home/ubuntu/ui-entrypoint-20261018-result.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result, indent=2))
