"""Rebuild lettering-free artwork used behind native text. Requires Pillow.

Run after extract-design-assets.py. Generated removal sources are checked in
under docs. Maps are converted as whole images; welcome edits use listed masks.
"""
from pathlib import Path
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter

root = Path(__file__).resolve().parents[1]
out = root / 'public/design-assets'
sources = root / 'docs/integration/ui-clarity-20261018/sources'
metadata = {}
for page, number in [('review',12), ('study',20), ('visit-hongmen',4)]:
    for device in ['desktop', 'mobile']:
        source = sources / f'{page}-{device}-clean-v2.png'
        name = f'{page}-art-{device}-v2.webp'
        Image.open(source).convert('RGB').save(out / name, lossless=True, method=6)
        metadata[name] = dict(kind='generated-ui-removal-background', source_image=number,
                              source_asset=f'{page}-{device}.webp',
                              generated_source=str(source.relative_to(root)), composition='continuous landscape without page UI')
# Each map is a single continuous painting. Never paste desktop strips into the
# portrait map: their summit positions and scales differ from the Word layout.
for device in ['desktop', 'mobile']:
    source = sources / f'map-{device}-clean-v2.png'
    name = f'map-art-{device}-v2.webp'
    Image.open(source).convert('RGB').save(out / name, lossless=True, method=6)
    metadata[name] = dict(kind='generated-ui-removal-background', source_image=3,
                          source_asset=f'map-{device}.webp', generated_source=str(source.relative_to(root)),
                          composition='one continuous image; no pasted patches or UI labels')
    source = sources / f'handbook-{device}-clean-v2.png'
    name = f'handbook-art-{device}-v2.webp'
    Image.open(source).convert('RGB').save(out / name, lossless=True, method=6)
    metadata[name] = dict(kind='generated-ui-removal-background', source_image=27,
                          source_asset=f'handbook-hero{ "-mobile" if device == "mobile" else ""}.webp',
                          generated_source=str(source.relative_to(root)), composition='continuous landscape without journal UI')

source = sources / 'routes-background-clean-v2.png'
landscape = Image.open(source).convert('RGB')
box = (round(landscape.width * .67), 0, landscape.width, landscape.height)
landscape.crop(box).save(out / 'route-landscape-art-v2.webp', lossless=True, method=6)
metadata['route-landscape-art-v2.webp'] = dict(kind='generated-ui-removal-background', source_image=5,
    generated_source=str(source.relative_to(root)), box=box, composition='mountain only, without pins or lettering')
box = (0, 0, round(landscape.width * .67), round(landscape.height * .45))
landscape.crop(box).save(out / 'route-paper-art-v2.webp', lossless=True, method=6)
metadata['route-paper-art-v2.webp'] = dict(kind='generated-ui-removal-background', source_image=5,
    generated_source=str(source.relative_to(root)), box=box, composition='quiet sky and distant mountains behind live text')
source = sources / 'handbook-girl-v2.png'
girl = Image.open(source).convert('RGBA')
assert girl.getchannel('A').getextrema()[0] == 0, 'The guide must have a transparent background.'
girl.thumbnail((512,768), Image.Resampling.LANCZOS)
girl.save(out / 'handbook-girl-v2.webp', lossless=True, method=6)
metadata['handbook-girl-v2.webp'] = dict(kind='generated-character-isolation', source_image=27,
    generated_source=str(source.relative_to(root)), transparent=True)
for device, boxes in {
    'desktop': [(322,314,858,414),(358,425,816,463),(417,496,755,583),(461,587,710,657)],
    'mobile': [(15,217,292,277),(7,278,303,309),(30,329,270,402),(48,401,253,456)],
}.items():
    original = Image.open(out / f'welcome-{device}.webp').convert('RGB')
    source = sources / f'welcome-cleared-{device}.png'
    generated = Image.open(source).convert('RGB').resize(original.size, Image.Resampling.LANCZOS)
    mask = Image.new('L', original.size)
    brush = ImageDraw.Draw(mask)
    for box in boxes:
        brush.rectangle(box, fill=255)
    name = f'welcome-art-{device}.webp'
    Image.composite(generated, original, mask.filter(ImageFilter.GaussianBlur(2))).save(out / name, lossless=True, method=6)
    metadata[name] = dict(kind='derived-backdrop', source_image=1, generated_source=str(source.relative_to(root)), patches=boxes, feather_radius=2)

crops = {f'read-art-{i}.webp': (f'read-card-{i}-desktop.webp', (9,10,218,252)) for i in range(5)}
crops.update({'read-hero-art.webp': ('read-hero-desktop.webp', (600,0,1211,211)), 'read-continue-art.webp': ('read-continue-desktop.webp', (490,0,1000,145))})
for i in range(3):
    source = f'scene-card-{i}-desktop.webp'
    image = Image.open(out / source)
    crops[f'scene-card-art-{i}-v2.webp'] = (source, (7,109,image.width-7,407))
crops['museum-art-clean-v2.webp'] = ('museum-art.webp', (0,0,583,510))
crops['study-stone-art-v2.webp'] = ('study-desktop.webp', (959,107,1175,280))
for i, (left, width) in enumerate([(203,141),(547,105),(880,112)]):
    crops[f'review-card-art-{i}-v2.webp'] = ('review-desktop.webp', (left,468,left+width,592))
for id, left in [('hongmen',294), ('zhongtian',498), ('nantian',702)]:
    crops[f'review-stamp-{id}-v2.webp'] = ('review-desktop.webp', (left,271,left+143,422))
crops['museum-nav-art-v2.webp'] = ('museum-nav.webp', (0,362,210,724))
for i, top in enumerate([128,282,437,594]):
    crops[f'route-art-{i}.webp'] = ('routes-desktop.webp', (26,top,172,top+123))
for name, (source, box) in crops.items():
    Image.open(out / source).crop(box).save(out / name, lossless=True, method=6)
    metadata[name] = dict(kind='derived-word-crop', source_asset=source, box=box)

# Extend the portrait canvas instead of letterboxing a narrow image in wider panes.
expanded_source = sources / 'welcome-expanded-mobile.png'
expanded = Image.open(expanded_source).convert('RGB').resize((520,767), Image.Resampling.LANCZOS)
original = Image.open(out / 'welcome-art-mobile.webp').convert('RGB')
mask = Image.new('L', original.size)
for x in range(original.width):
    alpha = min(1, x / 32, (original.width - 1 - x) / 32)
    ImageDraw.Draw(mask).line((x,0,x,766), fill=round(255 * max(0,alpha)))
expanded.paste(original,(105,0),mask)
expanded.save(out / 'welcome-art-expanded.webp', lossless=True, method=6)
metadata['welcome-art-expanded.webp'] = dict(kind='expanded-backdrop', source_asset='welcome-art-mobile.webp', generated_source=str(expanded_source.relative_to(root)), canvas=[520,767], original_offset=[105,0], edge_blend=32, preserved_original_core=[137,0,382,767])

manifest_path = out / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['assets'] = [a for a in manifest['assets'] if a['file'] not in metadata]
for name, info in metadata.items():
    path = out / name
    manifest['assets'].append(dict(file=name, size=list(Image.open(path).size), sha256=hashlib.sha256(path.read_bytes()).hexdigest(), **info))
manifest['assets'].sort(key=lambda a:a['file'])
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
print(f'{len(metadata)} native-UI artwork assets rebuilt and indexed.')
