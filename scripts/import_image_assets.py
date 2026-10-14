"""Import the supplied image archive into web assets; retain alpha and source hashes."""
import argparse, hashlib, json, re, zipfile
from pathlib import Path
from io import BytesIO
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
ALIASES = {
 'H-BG-07中天门主体建筑.png': 'H-ND-02',
 '天街全景图.png': 'H-ND-05-bg', '天街牌坊街道入口透明图.png': 'H-ND-05-gate',
 '天街街道局部透明图.png': 'H-ND-05-street',
 '桃花源索道站全景图.png': 'H-ND-13-bg', '桃花源换乘平台局部图.png': 'H-ND-13-platform',
 '桃花源索道站透明图.png': 'H-ND-13-station', '索道轿厢透明图.png': 'H-TR-01-cablecar',
 '南天门门前.png':'nantian-front','南天门门后、天街方向.png':'nantian-inside',
 '东天门古道入口局部透明图.png':'dongtian-path','东天门周边古道山景全景图.png':'dongtian-landscape',
 '东天门建筑完整透明图.png':'dongtian-gate','五岳独尊石刻周边环境全景.png':'stone-landscape',
 '天外村入口环境全景.png':'tianwai-landscape','日观峰观日平台环境全景.png':'riguan-landscape',
 '桃花峪游客入口环境全景.png':'taohua-landscape','首页全景图.png':'map-cover',
 **{f'素材{i}.png':f'legacy-{i}' for i in range(1,7)},
}
SPOTS={'H-ND-01':'hongmen','H-ND-02':'zhongtian','H-ND-03':'shibapan','H-ND-04':'nantianmen','H-ND-06':'bixia','H-ND-07':'yuhuang','H-ND-08':'stone','H-ND-09':'riguan','H-ND-10':'tianwai','H-ND-11':'taohua','H-ND-12':'dongyu','H-ND-14':'dongtian','H-ND-05-gate':'tianjie','H-ND-13-station':'taoyuan'}

def decode_name(info):
 name=info.filename
 if not info.flag_bits & 0x800:
  try:name=name.encode('cp437').decode('gbk')
  except UnicodeError:pass
 return Path(name).name

def main():
 parser=argparse.ArgumentParser();parser.add_argument('archive',type=Path);args=parser.parse_args()
 out=ROOT/'public/image-assets';out.mkdir(parents=True,exist_ok=True);rows=[];seen=set()
 with zipfile.ZipFile(args.archive) as archive:
  for info in archive.infolist():
   if info.is_dir():continue
   name=decode_name(info)
   if not name.lower().endswith('.png'):continue
   raw=archive.read(info)
   with Image.open(BytesIO(raw)) as original:
    im=original.convert('RGBA');size=list(im.size);alpha=im.getchannel('A');transparent=alpha.getextrema()[0]<255
    match=re.match(r'H-(?:BG|ND|NT)-\d{2}A?',name)
    key=ALIASES.get(name,match.group() if match else None)
    if not key:raise ValueError('Unmapped asset: '+name)
    if key in {'H-ND-18','H-ND-21'} and not transparent:key+='-bg'
    if key in seen:raise ValueError('Duplicate asset key: '+key)
    seen.add(key)
    bounds=alpha.getbbox() if transparent and key not in {'H-BG-03','H-BG-04','H-BG-06'} else (0,0,*im.size)
    if not bounds:raise ValueError('Empty asset: '+name)
    im=im.crop(bounds);im.thumbnail((1800,1500),Image.Resampling.LANCZOS)
    im.save(out/(key+'.webp'),'WEBP',quality=88,method=6)
    a=im.getchannel('A');cols=np.asarray(a,dtype=float).sum(axis=0);weight=float(cols.sum())
    centroid=sum(x*w for x,w in enumerate(cols))/weight if weight else im.width/2
    label=re.sub(r'^H-(?:BG|ND|NT)-\d{2}A?[ ｜]*','',Path(name).stem)
    label=label.replace('透明主体图','').replace('节点透明主体','').replace('透明主体','').replace('主节点','').replace('入口节点','入口').replace('透明图','').replace(' A','').replace('透明','')
    if key=='H-BG-15':label='亭台点景'
    if key.startswith('legacy-'):label=['远山意境','青绿群峰','山门登阶','山巅殿宇','石刻意境','牌坊意境'][int(key[-1])-1]
    category='山水' if not transparent or key in {'H-BG-03','H-BG-04','H-BG-06','H-BG-09','H-BG-11'} else '点景' if key.startswith(('H-NT','legacy-')) else '建筑'
    rows.append(dict(id=key,label=label,category=category,source=name,source_sha256=hashlib.sha256(raw).hexdigest(),originalSize=size,cropBox=list(bounds),width=im.width,height=im.height,transparent=transparent,centroidXNormalized=centroid/im.width,groundYNormalized=1,bytes=(out/(key+'.webp')).stat().st_size,spot_id=SPOTS.get(key),url='image-assets/'+key+'.webp',kind='concept_art',source_archive='图片资产.zip'))
 (ROOT/'src/image-assets.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
 print(f'Imported {len(rows)} images; {sum(row["bytes"] for row in rows):,} web bytes')

if __name__=='__main__':main()
