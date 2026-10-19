"""Rebuild the Word UI crops and documented art-only backgrounds.

Requires Pillow. Crops are lossless and retain source pixel coordinates. The two
AI-cleared source files stay local in public/design-assets; this script never
requests generated art or changes UI text, user data, or application code.
"""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
source = root.parent / 'UI设计图.docx'
out = root / 'public/design-assets'
out.mkdir(exist_ok=True)
recipes = json.loads((root / 'scripts/design-asset-crops.json').read_text())
with ZipFile(source) as archive:
    images = {i: Image.open(BytesIO(archive.read(f'word/media/image{i}.png'))).convert('RGB') for i in range(1, 31)}
for recipe in recipes:
    images[recipe['source_image']].crop(recipe['box']).save(out / recipe['file'], lossless=True, method=6)
# Specimen sheet 2 extends beyond its native page bounds, matching Pillow crop.
images[2].crop((0, 85, 1586, 992)).save(out / 'tour-body.webp', lossless=True, method=6)
original = images[22].crop((320, 179, 1235, 928))
generated = Image.open(out / 'guide-erased-source.png').convert('RGB').resize(original.size, Image.Resampling.LANCZOS)
mask = Image.new('L', original.size)
brush = ImageDraw.Draw(mask)
guide_boxes = [(44, 60, 443, 145), (44, 143, 276, 203), (569, 235, 890, 314), (124, 313, 614, 401), (202, 392, 811, 558), (200, 567, 500, 626), (802, 591, 915, 680), (20, 665, 899, 744)]
for box in guide_boxes:
    brush.rectangle(box, fill=255)
Image.composite(generated, original, mask.filter(ImageFilter.GaussianBlur(3))).save(out / 'guide-clean.webp', lossless=True, method=6)
manifest = []
by_file = {r['file']:r for r in recipes}
for path in sorted(list(out.glob('*.webp')) + list(out.glob('*.png'))):
    im = Image.open(path)
    entry = {'file':path.name, 'size':list(im.size), 'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
    if path.name in by_file:
        r = by_file[path.name]
        entry.update(kind='word-crop', source_image=r['source_image'], box=r['box'])
    elif path.stem == 'tour-body':
        entry.update(kind='word-crop', source_image=2, box=[0,85,1586,992])
    elif path.stem.startswith('map-clean'):
        entry.update(kind='legacy-derived-backdrop', source_image=3, deprecated=True, replacement='map-art-mobile-v2.webp' if 'mobile' in path.stem else 'map-art-desktop-v2.webp')
    elif path.stem == 'guide-clean':
        entry.update(kind='derived-backdrop', source_image=22, generated_source='guide-erased-source.png', patches=guide_boxes, feather_radius=3)
    else:
        entry.update(kind='generated-ui-removal-source', source_image=3 if path.stem.startswith('map') else 22, purpose='Only fill areas behind movable native controls; original visible art is retained outside the listed patches.')
    manifest.append(entry)
(out / 'manifest.json').write_text(json.dumps({'source_file':source.name, 'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(), 'assets':manifest}, ensure_ascii=False, indent=2))
print(f'{len(manifest)} artwork files indexed; {len(recipes)+1} Word crops rebuilt.')
import runpy
runpy.run_path(str(root / 'scripts/refine-native-ui-assets.py'))
