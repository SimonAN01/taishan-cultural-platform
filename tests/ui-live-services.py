"""Small real-provider smoke check, using a new anonymous session; never logs credentials."""
import argparse,json,time
from pathlib import Path
import httpx
p=argparse.ArgumentParser();p.add_argument('--base-url',required=True);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
report={'base_url':args.base_url,'scope':'isolated anonymous session; real providers, not browser fixtures','checks':[]}
with httpx.Client(base_url=args.base_url,timeout=90,follow_redirects=True) as client:
    catalog=client.get('/api/catalog').json()
    start=time.monotonic();response=client.post('/api/agent/chat',json={'message':'红门在泰山游览中有什么作用？','current_spot':'hongmen'});data=response.json()
    report['checks'].append({'kind':'agent','http_status':response.status_code,'mode':data.get('mode'),'answer_characters':len(data.get('answer','')),'sources':len(data.get('sources',[])),'seconds':round(time.monotonic()-start,2),'passed':response.status_code==200 and bool(data.get('answer'))})
    start=time.monotonic();response=client.post('/api/speech/tts',json={'text':'欢迎来到泰山。沿着山路，了解泰山文化。'})
    report['checks'].append({'kind':'tts','http_status':response.status_code,'content_type':response.headers.get('content-type'),'bytes':len(response.content),'seconds':round(time.monotonic()-start,2),'passed':response.status_code==200 and 'audio/' in response.headers.get('content-type','') and len(response.content)>1000})
    photo=next(s for s in catalog['spots'] if s['id']=='jingshi')['photos'][0];raw=client.get('/'+photo['url'].lstrip('/')).content
    start=time.monotonic();response=client.post('/api/vision/recognize',files={'file':('jingshi.webp',raw,'image/webp')});data=response.json()
    candidates=[c.get('spot_id') for c in data.get('candidates',[])];known={s['id'] for s in catalog['spots']}
    report['checks'].append({'kind':'vision_catalog_photo_smoke_not_accuracy','http_status':response.status_code,'status':data.get('status'),'candidates':candidates,'seconds':round(time.monotonic()-start,2),'passed':response.status_code==200 and data.get('status') in ['needs_confirmation','unknown'] and all(c in known for c in candidates)})
    if response.status_code==200 and candidates:
        confirmation=client.post('/api/vision/predictions/'+data['request_id']+'/confirm',json={'spot_id':candidates[0]})
        record=client.get('/api/journey').json()
        report['checks'].append({'kind':'vision_confirmation_persisted','http_status':confirmation.status_code,'passed':confirmation.status_code==200 and any(r.get('confirmed_spot')==candidates[0] for r in record.get('confirmed_predictions',[]))})
report['all_passed']=all(c['passed'] for c in report['checks']);args.output.parent.mkdir(parents=True,exist_ok=True);args.output.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False,indent=2));raise SystemExit(0 if report['all_passed'] else 1)
