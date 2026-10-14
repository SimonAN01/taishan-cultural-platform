"""Prepare user-owned cutouts without overwriting originals.
Existing alpha is preserved; opaque paper images use per-image border colour.
"""
from pathlib import Path
import argparse, json
import numpy as np
from PIL import Image, ImageFilter

parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, required=True)
args = parser.parse_args()
out = Path(__file__).resolve().parents[1] / 'public' / 'home-assets'
out.mkdir(parents=True, exist_ok=True)
manifest = {}
bands = {'H-BG-03', 'H-BG-04', 'H-BG-06'}
aliases = {'H-BG-07': 'H-ND-02'}
for p in sorted(args.source.glob('H-*.png')):
    original_key = p.name[:7]
    key = aliases.get(original_key, original_key)
    original = Image.open(p)
    rgba = np.array(original.convert('RGBA'))
    original_size = list(original.size)
    paper = None
    if key != 'H-BG-01':
        if rgba[:, :, 3].min() == 255:
            rgb = rgba[:, :, :3].astype(float)
            border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
            paper = np.median(border, axis=0)
            distance = np.sqrt(np.mean((rgb - paper) ** 2, axis=2))
            # Adapt the dead zone to paper noise; ramp retains feathered paint.
            variation = np.sqrt(np.mean((border - paper) ** 2, axis=1))
            dead = max(3., min(12., float(np.percentile(variation, 75)) + 2.))
            rgba[:, :, 3] = (np.clip((distance - dead) / 30., 0, 1) * 255).astype('uint8')
        alpha = rgba[:, :, 3]
        mask = alpha > 8
        padded = np.pad(mask.astype('uint8'), 1)
        neighbors = np.zeros(mask.shape, dtype='uint8')
        for dy, dx in [(a,b) for a in range(3) for b in range(3) if (a,b)!=(1,1)]:
            neighbors += padded[dy:dy+mask.shape[0], dx:dx+mask.shape[1]]
        # A component of one or two pixels has no neighbour with degree >= 2.
        adjacent_degree = np.asarray(Image.fromarray(neighbors).filter(ImageFilter.MaxFilter(3)))
        alpha[mask & (adjacent_degree <= 1)] = 0
        rgba[:, :, 3] = np.asarray(Image.fromarray(alpha).filter(ImageFilter.MedianFilter(3)))
    alpha = rgba[:, :, 3]
    yy, xx = np.where(alpha > 8)
    if len(xx) == 0:
        raise ValueError(f'No content in {p.name}')
    x0, y0 = max(0, int(xx.min()) - 6), max(0, int(yy.min()) - 6)
    x1, y1 = min(rgba.shape[1], int(xx.max()) + 7), min(rgba.shape[0], int(yy.max()) + 7)
    if key in bands or key == 'H-BG-01':
        y0, y1 = 0, rgba.shape[0]
    if key == 'H-BG-01':
        x0, x1 = 0, rgba.shape[1]
    crop = rgba[y0:y1, x0:x1]
    im = Image.fromarray(crop)
    im.save(out / f'{key}.png')
    preview = im.copy()
    preview.thumbnail((1800, 1500), Image.Resampling.LANCZOS)
    preview.save(out / f'{key}.webp', quality=88, method=6)
    weights = crop[:, :, 3].astype(float)
    cx = float((weights.sum(axis=0) * np.arange(im.width)).sum() / weights.sum())
    ground = int(np.where(weights > 8)[0].max())
    manifest[key] = dict(source=p.name, originalSize=original_size, cropBox=[x0,y0,x1,y1],
        width=im.width, height=im.height, centroidX=cx, centroidXNormalized=cx/im.width,
        groundY=ground, groundYNormalized=ground/im.height, keepVerticalCanvas=key in bands,
        paperColor=paper.tolist() if paper is not None else None,
        png=f'/home-assets/{key}.png', webp=f'/home-assets/{key}.webp')
(out / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Prepared {len(manifest)} assets in {out}')
