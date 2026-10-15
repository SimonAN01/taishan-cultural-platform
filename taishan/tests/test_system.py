"""Run: .venv/bin/python -m unittest discover -s tests -v"""
import io
import os
import tempfile
import unittest
import json
import threading
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch,AsyncMock
import httpx
from pathlib import Path
os.environ['DATA_DIR']=tempfile.mkdtemp(prefix='taishan-tests-')
from PIL import Image
from fastapi.testclient import TestClient
from backend.app import app, CAT, VISION, limits, db
from backend.retrieval import SemanticRetriever

class SystemTests(unittest.TestCase):
 def setUp(self):
  limits.clear();self.client=TestClient(app);self.client.__enter__();self.other=TestClient(app);self.other.__enter__()
 def tearDown(self):self.client.__exit__(None,None,None);self.other.__exit__(None,None,None)
 def test_immersive_build_is_served_under_its_own_path(self):
  from backend.app import IMMERSIVE_DIR
  if not (IMMERSIVE_DIR/'index.html').is_file():self.skipTest('Run npm run build at repository root to test the immersive build')
  page=self.client.get('/experience/')
  self.assertEqual(page.status_code,200)
  self.assertIn('/experience/assets/',page.text)
  self.assertIn("connect-src 'self' blob:",page.headers['content-security-policy'])
  self.assertTrue(self.client.get('/api/health').json()['immersive_available'])
  model=self.client.get('/experience/models/princess-agent.glb')
  self.assertEqual(model.content[:4],b'glTF')
 def test_catalog_routes_have_valid_ids_and_sources(self):
  c=self.client.get('/api/catalog').json();ids={s['id'] for s in c['spots']};self.assertGreaterEqual(len(ids),8)
  for r in c['routes']:
   self.assertTrue(set(r['node_sequence']+r['detours'])<=ids);self.assertTrue(r['sources'])
  for s in c['spots']:self.assertTrue(s['sources'])
  for a in c['artifacts']:
   self.assertIn(a['spot_id'],ids);self.assertTrue(a['sources'])
  photo_ids={p['id'] for spot in c['spots'] for p in spot.get('photos',[])}
  for a in c['artifacts']:self.assertIn(a['photo_id'],photo_ids)
  self.assertEqual(next(a for a in c['artifacts'] if a['id']=='tang-inscription')['spot_id'],'daguan')
  tianwai=next(r for r in c['routes'] if r['id']=='tianwai')
  variants={v['id']:v for v in tianwai['variants']}
  self.assertIn('shibapan',variants['walk']['node_sequence']);self.assertNotIn('shibapan',variants['cable']['node_sequence'])
  for v in variants.values():self.assertTrue(set(v['node_sequence'])<=ids)
  self.assertEqual(self.client.get('/api/spots/missing').status_code,404)
 def test_real_photo_assets_have_provenance(self):
  from urllib.parse import urlparse
  root=Path(__file__).resolve().parent.parent
  photos=[p for s in CAT['spots'] for p in s.get('photos',[])]
  self.assertGreaterEqual(len(photos),20);self.assertGreaterEqual(sum(bool(s.get('photos')) for s in CAT['spots']),15)
  for p in photos:
   self.assertTrue((root/'frontend'/p['url']).is_file());self.assertTrue(p['author']);self.assertTrue(p['license']);self.assertEqual(urlparse(p['source_page']).hostname,'commons.wikimedia.org')
   with Image.open(root/'frontend'/p['url']) as im:self.assertEqual(im.size,(p['width'],p['height']))
 def test_anonymous_sessions_and_clear_are_isolated(self):
  self.client.post('/api/journey/visit',json={'spot_id':'nantian'})
  self.client.post('/api/journey/favorite',json={'kind':'spot','item_id':'nantian','saved':True})
  self.assertEqual(len(self.client.get('/api/journey').json()['visited']),1)
  self.assertFalse(self.other.get('/api/journey').json()['visited'])
  self.client.delete('/api/journey');self.assertFalse(self.client.get('/api/journey').json()['favorites'])
 def test_clear_chat_preserves_journey_and_other_sessions(self):
  self.client.post('/api/journey/visit',json={'spot_id':'nantian'})
  self.client.post('/api/journey/favorite',json={'kind':'spot','item_id':'nantian','saved':True})
  self.client.post('/api/agent/chat',json={'message':'你是谁'})
  self.other.post('/api/agent/chat',json={'message':'你是谁'})
  self.assertTrue(self.client.get('/api/agent/history').json())
  self.assertEqual(self.client.delete('/api/agent/history').status_code,200)
  self.assertFalse(self.client.get('/api/agent/history').json())
  self.assertTrue(self.other.get('/api/agent/history').json())
  journey=self.client.get('/api/journey').json()
  self.assertEqual(len(journey['visited']),1)
  self.assertEqual(len(journey['favorites']),1)
 def test_grounded_answers_followup_refusal_and_sources(self):
  a=self.client.post('/api/agent/chat',json={'message':'封禅是什么？'}).json()
  self.assertIn('祭天',a['answer']);self.assertTrue(a['sources']);self.assertFalse(a['refused'])
  a=self.client.post('/api/agent/chat',json={'message':'介绍一下这里','current_spot':'nantian'}).json()
  self.assertIn('南天门',a['answer']);self.assertTrue(a['sources'])
  a=self.client.post('/api/agent/chat',json={'message':'它在哪里？'}).json();self.assertIn('南天门',a['answer'])
  a=self.client.post('/api/agent/chat',json={'message':'火星采矿机器人的维修步骤'}).json();self.assertTrue(a['refused']);self.assertFalse(a['sources'])
  a=self.client.post('/api/agent/chat',json={'message':'今天门票多少钱？'}).json();self.assertTrue(a['refused']);self.assertIn('无法确认',a['answer'])
  self.assertTrue(self.client.get('/api/agent/history').json());self.assertFalse(self.other.get('/api/agent/history').json())
 def test_poem_and_routes(self):
  for q,expected in [('望岳写了什么？','会当凌绝顶'),('为什么说会当凌绝顶？','愿望'),('红门线怎么走？','红门'),('天外村怎么走？','中天门'),('桃花峪路线','索道'),('东御道路线','东麓')]:
   r=self.client.post('/api/agent/chat',json={'message':q}).json();self.assertIn(expected,r['answer'],q);self.assertTrue(r['sources'])
 def test_identity_spot_listing_and_route_tools(self):
  for q,expected,tool in [('你是谁','碧霞仙子','guide_identity'),('有什么景点','南天门','list_spots'),('推荐哪些景点','经石峪','list_spots'),('第一次来怎么玩','红门','list_routes')]:
   a=self.client.post('/api/agent/chat',json={'message':q}).json();self.assertFalse(a['refused'],q);self.assertIn(expected,a['answer']);self.assertIn(tool,a['tool_calls'])
  a=self.client.post('/api/agent/chat',json={'message':'南天门有什么文化故事？','current_spot':'nantian'}).json()
  self.assertNotIn('list_spots',a['tool_calls']);self.assertIn('南天门',a['answer'])
 def test_citation_numbers_match_evidence_and_history(self):
  a=self.client.post('/api/agent/chat',json={'message':'封禅是什么？'}).json()
  self.assertTrue(a['citations'])
  for c in a['citations']:
   self.assertIn('['+str(c['number'])+']',a['answer']);self.assertTrue(c['sources'])
  h=self.client.get('/api/agent/history').json();self.assertEqual(h[-1]['citations'],a['citations'])
 def test_role_intro_does_not_leave_orphan_citations(self):
  response=httpx.Response(200,json={'choices':[{'message':{'content':'我是碧霞仙子，这个平台的文化导览角色[1]。'}}]},request=httpx.Request('POST','https://model.test/chat/completions'))
  with patch('backend.app.LLM_ENABLED',True),patch('backend.app.httpx.AsyncClient') as factory:
   factory.return_value.__aenter__.return_value.post=AsyncMock(return_value=response)
   result=self.client.post('/api/agent/chat',json={'message':'你是谁'}).json()
  self.assertEqual(result['mode'],'rag_llm');self.assertNotIn('[1]',result['answer']);self.assertFalse(result['citations'])
 def test_corrupt_embedding_falls_back_to_real_knowledge(self):
  directory=Path(tempfile.mkdtemp())
  for name in ['model_quantized.onnx','tokenizer.json']:(directory/name).write_text('broken')
  retriever=SemanticRetriever(directory,CAT)
  with patch.object(retriever,'load',side_effect=ValueError('invalid weights')):docs=retriever.search('封禅是什么')
  self.assertTrue(docs);self.assertFalse(retriever.available())
 def test_confirmation_requires_own_known_prediction(self):
  self.client.get('/api/journey');sid=self.client.cookies['taishan_session']
  prediction={'status':'needs_confirmation','candidates':[{'spot_id':'nantian'}]}
  with db() as con:
   con.execute('INSERT INTO predictions(id,session_id,model_version,result,created_at) VALUES(?,?,?,?,?)',('fixture-known',sid,'test fixture',json.dumps(prediction),1))
   con.execute('INSERT INTO predictions(id,session_id,model_version,result,created_at) VALUES(?,?,?,?,?)',('fixture-unknown',sid,'test fixture',json.dumps({'status':'unknown','candidates':[]}),1))
  self.assertEqual(self.other.post('/api/vision/predictions/fixture-known/confirm',json={'spot_id':'nantian'}).status_code,404)
  self.assertEqual(self.client.post('/api/vision/predictions/fixture-known/confirm',json={'spot_id':'hongmen'}).status_code,422)
  self.assertEqual(self.client.post('/api/vision/predictions/fixture-unknown/confirm',json={'spot_id':'nantian'}).status_code,422)
  self.assertEqual(self.client.post('/api/vision/predictions/fixture-known/confirm',json={'spot_id':'nantian'}).status_code,200)
  self.assertEqual(self.client.get('/api/journey').json()['confirmed_predictions'][0]['confirmed_spot'],'nantian')
  self.client.delete('/api/journey');self.assertFalse(self.client.get('/api/journey').json()['confirmed_predictions'])
 def test_clear_does_not_allow_inflight_chat_to_restore_deleted_history(self):
  self.client.get('/api/journey');self.other.cookies.update(self.client.cookies)
  entered=threading.Event();release=threading.Event()
  def slow_search(*args):
   entered.set();release.wait(5);return []
  with patch('backend.app.RETRIEVER.search',side_effect=slow_search),ThreadPoolExecutor(max_workers=1) as pool:
   future=pool.submit(self.client.post,'/api/agent/chat',json={'message':'封禅是什么？'})
   self.assertTrue(entered.wait(5))
   try:self.assertEqual(self.other.delete('/api/journey').status_code,200)
   finally:release.set()
   self.assertEqual(future.result(timeout=5).status_code,409)
  self.assertFalse(self.client.get('/api/agent/history').json())
 def test_upload_boundaries_and_origin(self):
  self.assertEqual(self.client.post('/api/vision/recognize',files={'file':('bad.jpg',b'not an image','image/jpeg')}).status_code,415)
  self.assertEqual(self.client.post('/api/vision/recognize',files={'file':('big.jpg',b'x'*(8*1024*1024+1),'image/jpeg')}).status_code,413)
  self.assertEqual(self.client.post('/api/agent/chat',json={'message':'hi'},headers={'Origin':'https://evil.example'}).status_code,403)
  self.assertEqual(self.client.post('/api/agent/chat',json={'message':' '*10}).status_code,422)
 def test_rate_limits(self):
  for _ in range(20):self.client.post('/api/agent/chat',json={'message':'封禅是什么'})
  self.assertEqual(self.client.post('/api/agent/chat',json={'message':'封禅是什么'}).status_code,429)
 def test_real_vision_rejects_plain_image(self):
  if not VISION.available():self.skipTest('CLIP weights not installed')
  buf=io.BytesIO();Image.new('RGB',(256,256),'white').save(buf,format='PNG')
  result=self.client.post('/api/vision/recognize',files={'file':('blank.png',buf.getvalue(),'image/png')})
  self.assertEqual(result.status_code,200,result.text);r=result.json()
  self.assertEqual(r['status'],'unknown');self.assertIsNone(r['confidence']);self.assertEqual(r['score_type'],'cosine_similarity');self.assertEqual(r['candidates'],[])
  self.assertEqual(len(r['request_id']),32)
 def test_story_checks_sequence_visits_answers_and_session_isolation(self):
  public=self.client.get('/api/catalog').json()['story']
  self.assertEqual(len(public['chapters']),5)
  self.assertTrue(all('correct_index' not in ch and 'explanation' not in ch for ch in public['chapters']))
  chapters=CAT['story']['chapters']
  first=chapters[0]
  self.assertEqual(self.client.post('/api/story/chapters/missing/answer',json={'choice':0}).status_code,404)
  self.assertEqual(self.client.post('/api/story/chapters/gate/answer',json={'choice':3}).status_code,422)
  self.assertEqual(self.client.post('/api/story/chapters/gate/answer',json={'choice':0}).status_code,409)
  self.client.post('/api/journey/visit',json={'spot_id':first['spot_id']})
  wrong=self.client.post('/api/story/chapters/gate/answer',json={'choice':1}).json()
  self.assertFalse(wrong['correct']);self.assertEqual(wrong['progress']['completed'],[])
  self.assertEqual(self.client.post('/api/story/chapters/stone/answer',json={'choice':1}).status_code,409)
  for chapter in chapters:
   self.client.post('/api/journey/visit',json={'spot_id':chapter['spot_id']})
   result=self.client.post('/api/story/chapters/'+chapter['id']+'/answer',json={'choice':chapter['correct_index']})
   self.assertEqual(result.status_code,200);self.assertTrue(result.json()['correct'])
   self.assertEqual(self.client.post('/api/story/chapters/'+chapter['id']+'/answer',json={'choice':chapter['correct_index']}).status_code,200)
  progress=self.client.get('/api/journey').json()['story_progress']
  self.assertEqual(len(progress['completed']),5);self.assertIsNone(progress['next_chapter'])
  self.assertEqual(self.other.get('/api/journey').json()['story_progress']['completed'],[])
  self.client.delete('/api/journey')
  self.assertEqual(self.client.get('/api/journey').json()['story_progress']['completed'],[])
  self.assertEqual(self.client.post('/api/story/chapters/gate/answer',json={'choice':0}).status_code,409)
 def test_poem_and_route_context_does_not_reuse_old_spot(self):
  with patch('backend.app.LLM_ENABLED',False):
   self.client.post('/api/agent/chat',json={'message':'南天门有什么故事','current_spot':'nantian'})
   result=self.client.post('/api/agent/chat',json={'message':'这首诗里的羽人是什么意思','current_poem':'libai-2'}).json()
   self.assertIn('get_poem_info',result['tool_calls'])
   self.assertEqual(result['retrieved'][0]['id'],'k-poem-libai-2')
   self.assertIn('羽人指仙人',result['answer'])
   other=self.client.post('/api/agent/chat',json={'message':'望岳写了什么','current_poem':'libai-2'}).json()
   self.assertIn('k-poem',[d['id'] for d in other['retrieved']])
   explicit=self.client.post('/api/agent/chat',json={'message':'李白游泰山其一的天门一长啸是什么意思','current_poem':'libai-2'}).json()
   self.assertEqual(explicit['retrieved'][0]['id'],'k-poem-libai-1')
   route=self.client.post('/api/agent/chat',json={'message':'这条路线怎么走','current_route':'taohua'}).json()
   self.assertIn('get_route_info',route['tool_calls']);self.assertEqual(route['retrieved'][0]['id'],'tool-route-taohua')
   self.assertEqual(self.client.post('/api/agent/chat',json={'message':'这首诗','current_poem':'missing'}).status_code,404)

 def test_cloud_vision_no_local_inference_and_clear_failure(self):
  result={'model_version':'test cloud fixture','method':'cloud_visual','status':'needs_confirmation','confidence':None,'candidates':[{'spot_id':'jingshi','name':'经石峪','reason':'可见摩崖刻字'}]}
  buf=io.BytesIO();Image.new('RGB',(64,64),'white').save(buf,'PNG')
  with patch('backend.app.VISION_BACKEND','cloud'),patch('backend.app.LLM_ENABLED',True),patch('backend.app.recognize_cloud',AsyncMock(return_value=result)),patch.object(VISION,'recognize',side_effect=AssertionError('local model must stay unloaded')):
   response=self.client.post('/api/vision/recognize',files={'file':('fixture.png',buf.getvalue(),'image/png')})
   self.assertEqual(response.status_code,200);self.assertEqual(response.json()['method'],'cloud_visual')
   rid=response.json()['request_id']
   self.assertEqual(self.client.post('/api/vision/predictions/'+rid+'/confirm',json={'spot_id':'jingshi'}).status_code,200)
  with patch('backend.app.VISION_BACKEND','cloud'),patch('backend.app.LLM_ENABLED',True),patch('backend.app.recognize_cloud',AsyncMock(side_effect=ValueError('bad output'))),patch.object(VISION,'recognize',side_effect=AssertionError('no automatic local fallback')):
   self.assertEqual(self.client.post('/api/vision/recognize',files={'file':('fixture.png',buf.getvalue(),'image/png')}).status_code,503)
 def test_cloud_vision_rejects_invented_ids_and_unknown_candidates(self):
  import asyncio
  from backend.cloud_vision import recognize_cloud
  def run(output):
   response=httpx.Response(200,request=httpx.Request('POST','https://example.test'),json={'choices':[{'message':{'content':json.dumps(output)}}]})
   with patch('backend.cloud_vision.httpx.AsyncClient.post',AsyncMock(return_value=response)):
    return asyncio.run(recognize_cloud(Image.new('RGB',(64,64)),CAT['spots'],'https://example.test','test-key','test-model','test-session'))
  with self.assertRaises(ValueError):run({'status':'needs_confirmation','candidates':[{'spot_id':'invented','reason':'test'}]})
  result=run({'status':'unknown','candidates':[{'spot_id':'jingshi','reason':'discard this'}]})
  self.assertEqual(result['status'],'unknown');self.assertEqual(result['candidates'],[])
  result=run({'status':'needs_confirmation','candidates':[{'spot_id':'jingshi','reason':'刻字'},{'spot_id':'jingshi','reason':'重复'}]})
  self.assertEqual(len(result['candidates']),1);self.assertIsNone(result['confidence']);self.assertNotIn('similarity',result['candidates'][0])

if __name__=='__main__':unittest.main()
