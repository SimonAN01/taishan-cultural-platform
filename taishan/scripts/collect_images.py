"""License-aware Mount Tai image library. Uses Crawl4AI for seed-page crawl,
then the public MediaWiki API for canonical metadata and licensed image URLs.
Run with .crawl-venv/bin/python scripts/collect_images.py --limit 1000
"""
import argparse,asyncio,csv,hashlib,html,io,json,re,time
from collections import Counter,deque
from pathlib import Path
from urllib.parse import quote
import httpx
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'data/image_library'
API='https://commons.wikimedia.org/w/api.php'
UA='TaishanCultureDatasetCollector/1.0 (educational cultural project; low-rate collection)'
ALIASES={'hongmen':['hongmen','red gate','red door','红门'],'wanxian':['wanxian','万仙楼'],'doumu':['doumu','dou mu','斗母','斗姆'],'jingshi':['jingshi','jing shi','经石峪','金刚经'],'zhongtian':['zhongtian','middle heaven','中天门','halfway gate to heaven'],'wudafu':['wudafu','five grand','五大夫'],'shibapan':['eighteen twist','eighteen bend','十八盘'],'nantian':['nantian','south heaven','southern heaven','南天门'],'tianjie':['tianjie','heavenly street','天街'],'bixia':['bixia temple','bixia shrine','bixia ci','碧霞祠'],'yuhuang':['jade emperor','yuhuang','玉皇顶','玉皇庙'],'riguan':['riguan','sun viewing','日观峰'],'tianwai':['tianwai','天外村'],'taohua':['taohua','桃花峪','桃花源'],'dongyu':['dongyudao','东御道'],'daguan':['daguanfeng','大观峰'],'daimiao':['dai temple','dai miao','daimiao','岱庙']}
def clean(value):return html.unescape(re.sub('<[^>]+>','',value or '')).strip()
def infer(title,categories,description=''):
 text=(title+' '+' '.join(categories)+' '+description).lower()
 if re.search(r'malaysia|penang|butterworth|玉皇阁',text):return 'unclassified'
 matches=[label for label,aliases in ALIASES.items() if any(a in text for a in aliases)]
 return matches[0] if len(matches)==1 else 'unclassified'

def dhash(image):
 pixels=image.convert('L').resize((9,8));values=[pixels.getpixel((col,row)) for row in range(8) for col in range(9)];n=0
 for row in range(8):
  for col in range(8):n=(n<<1)|(values[row*9+col]>values[row*9+col+1])
 return n

async def seed_crawl():
 from crawl4ai import AsyncWebCrawler,CrawlerRunConfig,CacheMode
 from crawl4ai.async_crawler_strategy import AsyncHTTPCrawlerStrategy
 seed='https://commons.wikimedia.org/wiki/Category:Mount_Tai'
 async with AsyncWebCrawler(crawler_strategy=AsyncHTTPCrawlerStrategy()) as crawler:
  result=await crawler.arun(seed,config=CrawlerRunConfig(cache_mode=CacheMode.BYPASS,page_timeout=30000))
  (OUT/'crawl4ai_seed.json').write_text(json.dumps({'url':seed,'success':result.success,'status':result.status_code,'fetched_at':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'error':result.error_message,'images':result.media.get('images',[]),'links':result.links},ensure_ascii=False,indent=2))
  if result.success:(OUT/'crawl4ai_seed.md').write_text(result.markdown.raw_markdown)
  print('Crawl4AI seed:',result.success,flush=True)

def save_manifest(manifest):
 rows=list(manifest.values());target=OUT/'manifest.json';temporary=target.with_suffix('.json.tmp')
 temporary.write_text(json.dumps(rows,ensure_ascii=False,indent=2));temporary.replace(target)
 fields=['file','label','label_status','split','source_page','original_url','license','license_url','author','credit','description','date_original','width','height','sha256','original_sha1','dhash','near_duplicate_of','bytes']
 temporary=OUT/'dataset_manifest.csv.tmp'
 with temporary.open('w',newline='',encoding='utf-8-sig') as stream:
  writer=csv.DictWriter(stream,fieldnames=fields,extrasaction='ignore');writer.writeheader();writer.writerows(rows)
 temporary.replace(OUT/'dataset_manifest.csv')

async def main(limit,max_new):
 OUT.mkdir(parents=True,exist_ok=True)
 await seed_crawl()
 async with httpx.AsyncClient(headers={'User-Agent':UA},timeout=45,follow_redirects=True,limits=httpx.Limits(max_connections=3)) as client:
  async def query(params):
   cache_dir=OUT/'api_cache';cache_dir.mkdir(exist_ok=True)
   cache=cache_dir/(hashlib.sha256(json.dumps(params,sort_keys=True).encode()).hexdigest()+'.json')
   if cache.exists():return json.loads(cache.read_text())
   for attempt in range(3):
    await asyncio.sleep(2)
    r=await client.get(API,params={'format':'json','formatversion':2,'maxlag':5,**params})
    if r.status_code==429:
     delay=r.headers.get('Retry-After','60')
     delay=max(60,int(delay) if delay.isdigit() else 60)
     print('Rate limit: waiting',delay,'seconds before retry',flush=True)
     await asyncio.sleep(delay);continue
    r.raise_for_status();d=r.json()
    if 'error' in d:raise RuntimeError(d['error'].get('info','API error'))
    cache.write_text(json.dumps(d,ensure_ascii=False));return d
   raise RuntimeError('Wikimedia rate limit persists: stopped with cached progress')
  seen=set();files={};discovery=[]
  # Wikimedia's canonical category uses a space; redirects are resolved by API.
  queue=deque([('Category:Mount Tai',0),('Category:Dai Temple',0)])
  while queue and len(seen)<100:
   category,depth=queue.popleft()
   if category in seen:continue
   seen.add(category);cont={};count=0
   while True:
    d=await query({'action':'query','list':'categorymembers','cmtitle':category,'cmlimit':500,'cmtype':'file|subcat',**cont})
    for member in d.get('query',{}).get('categorymembers',[]):
     title=member['title']
     if member['ns']==14 and depth<3 and title not in ['Category:Bixia Yuanjun'] and not re.search('People|Paintings|Maps|Stamps|Videos|Panoramas|Historical images',title,re.I):queue.append((title,depth+1))
     elif member['ns']==6:
      files.setdefault(member['pageid'],{'pageid':member['pageid'],'title':title,'categories':[]})['categories'].append(category);count+=1
    cont=d.get('continue',{})
    if not cont:break
   discovery.append({'category':category,'depth':depth,'files':count})
   (OUT/'discovery.json').write_text(json.dumps({'categories':discovery,'files':list(files.values())},ensure_ascii=False,indent=2))
   print('Category',len(seen),category,'Files',len(files),flush=True)
  # API search adds pages missing from category links, scoped to Mount Tai.
  for term in ['"Mount Tai"','Nantianmen "Mount Tai"','Zhongtianmen "Mount Tai"','Jingshiyu "Mount Tai"','"Dai Temple" Tai\'an']:
   cont={}
   for _ in range(3):
    d=await query({'action':'query','list':'search','srsearch':term,'srnamespace':6,'srlimit':100,**cont})
    for member in d.get('query',{}).get('search',[]):files.setdefault(member['pageid'],{'pageid':member['pageid'],'title':member['title'],'categories':['Search: '+term]})
    cont=d.get('continue',{})
    if not cont:break
  (OUT/'discovery.json').write_text(json.dumps({'categories':discovery,'files':list(files.values())},ensure_ascii=False,indent=2))
  approved=[];rejected=[];sha_seen=set();ids=list(files)
  for offset in range(0,len(ids),40):
   d=await query({'action':'query','pageids':'|'.join(str(x) for x in ids[offset:offset+40]),'prop':'imageinfo','iiprop':'url|size|sha1|mime|extmetadata','iiurlwidth':1280})
   for page in d.get('query',{}).get('pages',[]):
    if not page.get('imageinfo'):continue
    item=page['imageinfo'][0];meta=item.get('extmetadata',{});lic=clean(meta.get('LicenseShortName',{}).get('value'));f=files[page['pageid']]
    reason=None
    if item.get('mime') not in ['image/jpeg','image/png','image/webp']:reason='not_supported_photo_format'
    elif not re.search(r'CC BY|CC0|Public domain|PDM',lic,re.I):reason='license_not_allowlisted'
    elif item.get('width',0)<480 or item.get('height',0)<320:reason='small_image'
    elif re.search(r'\bmap\b|\blogo\b|\bstamp\b|\bpainting\b|\bdrawing\b|\bdiagram\b',f['title'],re.I):reason='not_landmark_photo'
    elif item.get('sha1') in sha_seen:reason='same_original_sha1'
    if reason:rejected.append({'title':f['title'],'reason':reason,'license':lic});continue
    sha_seen.add(item.get('sha1'))
    approved.append({**f,'label':infer(f['title'],f['categories'],clean(meta.get('ImageDescription',{}).get('value'))),'license':lic,'license_url':clean(meta.get('LicenseUrl',{}).get('value')),'author':clean(meta.get('Artist',{}).get('value')),'credit':clean(meta.get('Credit',{}).get('value')),'description':clean(meta.get('ImageDescription',{}).get('value')),'date_original':clean(meta.get('DateTimeOriginal',{}).get('value')),'original_url':item['url'],'download_url':item.get('thumburl',item['url']),'source_page':item.get('descriptionurl','https://commons.wikimedia.org/wiki/'+quote(f['title'])),'original_width':item['width'],'original_height':item['height'],'original_sha1':item.get('sha1'),'label_status':'pending_manual_review','split':'unassigned'})
   print('Metadata',min(offset+40,len(ids)),'/',len(ids),'Approved',len(approved),flush=True)
  (OUT/'candidates.json').write_text(json.dumps(approved,ensure_ascii=False,indent=2));(OUT/'rejected.json').write_text(json.dumps(rejected,ensure_ascii=False,indent=2))
  # Prefer geographically specific candidates; record uncertain labels separately.
  approved.sort(key=lambda x:(x['label']=='unclassified',x['label'],x['pageid']))
  groups={}
  for item in approved:groups.setdefault(item['label'],deque()).append(item)
  approved=[]
  while any(groups.values()):
   for group in groups.values():
    if group:approved.append(group.popleft())
  previous=json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else []
  manifest={item['pageid']:item for item in previous};errors=[];hashes=[(int(item['dhash'],16),item['file']) for item in previous];new_count=0;attempted=0;stop_reason='source_exhausted'
  print('Resume: existing',len(manifest),'photos',flush=True)
  for n,item in enumerate(approved,1):
   if item['pageid'] in manifest and (OUT/manifest[item['pageid']]['file']).is_file():continue
   if len(manifest)>=limit:stop_reason='target_reached';break
   if attempted>=max_new:stop_reason='batch_complete';break
   attempted+=1
   label=item['label'];folder=OUT/'images'/label;folder.mkdir(parents=True,exist_ok=True)
   extension=Path(item['original_url'].split('?')[0]).suffix.lower()
   target=folder/(str(item['pageid'])+extension)
   try:
    if not target.exists():
     # imageinfo may return the full original when requested width exceeds it.
     # Request a supported thumbnail through the API to avoid large originals.
     if 'thumbnail_unscaled' in item['download_url'] and item['original_width']>500:
      width=960 if item['original_width']>960 else 500
      info=await query({'action':'query','pageids':str(item['pageid']),'prop':'imageinfo','iiprop':'url','iiurlwidth':width})
      thumbnail=info.get('query',{}).get('pages',[{}])[0].get('imageinfo',[{}])[0].get('thumburl')
      if thumbnail:item['download_url']=thumbnail
     await asyncio.sleep(1.5)
     for attempt in range(3):
      r=await client.get(item['download_url'])
      if r.status_code!=429 or attempt==2:break
      retry_after=r.headers.get('Retry-After','60')
      delay=max(10,int(retry_after) if retry_after.isdigit() else 60)
      print('Image rate limit: waiting',delay,'seconds',flush=True)
      await asyncio.sleep(delay)
     if r.status_code==429:
      errors.append({'pageid':item['pageid'],'error':'rate_limit','retry_after':r.headers.get('Retry-After')});stop_reason='rate_limit';break
     r.raise_for_status()
     if len(r.content)>10*1024*1024:raise ValueError('image exceeds 10MB safety limit')
     target.write_bytes(r.content)
    with Image.open(target) as im:
     im.verify()
    with Image.open(target) as im:
     width,height=im.size;perceptual=dhash(im)
    near=next((f for h,f in hashes if (h^perceptual).bit_count()<=4),None)
    hashes.append((perceptual,str(target.relative_to(OUT))))
    item.update(file=str(target.relative_to(OUT)),width=width,height=height,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),dhash=f'{perceptual:016x}',near_duplicate_of=near or '',bytes=target.stat().st_size)
    manifest[item['pageid']]=item;new_count+=1
    print('Downloaded',len(manifest),'total; new',new_count,flush=True)
   except Exception as error:errors.append({'pageid':item['pageid'],'error':str(error)[:300]})
   save_manifest(manifest)
  save_manifest(manifest);(OUT/'download_errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2));rows=list(manifest.values())
  summary={'discovered':len(files),'license_approved_candidates':len(approved),'downloaded':len(rows),'new_downloaded':new_count,'stopped_reason':stop_reason,'by_label':dict(Counter(i['label'] for i in rows)),'near_duplicates':sum(bool(i['near_duplicate_of']) for i in rows),'bytes':sum(i['bytes'] for i in rows),'errors':len(errors),'all_labels_need_manual_review':True,'training_performed':False,'source':'Wikimedia Commons','crawler_skill':'brettdavies/crawl4ai-skill@98f71583e27fe07f3f662398bc3c1c59af75e70c'}
  (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2));print('SUMMARY',json.dumps(summary,ensure_ascii=False),flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--limit',type=int,default=1000);parser.add_argument('--max-new',type=int,default=100);args=parser.parse_args();asyncio.run(main(args.limit,args.max_new))
