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
 def test_health_matches_documented_api_version(self):
  health=self.client.get('/api/health').json()
  self.assertEqual(self.client.get('/openapi.json').json()['info']['version'],health['version'])
 def test_switching_spots_resets_pronoun_query_and_sends_current_place_to_agent(self):
  from backend import app as service
  self.client.post('/api/agent/chat',json={'message':'大观峰的石刻有什么文化意义','current_spot':'daguan'})
  document=dict(CAT['knowledge'][0],relevance=1)
  with patch.object(service,'AGENT_PROVIDER','coze'),patch.object(service,'COZE_ENABLED',True),patch.object(service,'guide_tools',return_value=([],[])),patch.object(service.RETRIEVER,'search',return_value=[document]) as search,patch.object(service,'run_coze',AsyncMock(return_value='请对照本处文化资料。[1]')) as generate:
   response=self.client.post('/api/agent/chat',json={'message':'这里有什么故事','current_spot':'daimiao'})
   self.assertEqual(response.status_code,200)
   self.assertNotIn('大观峰',search.call_args.args[0])
   self.assertIn('岱庙',search.call_args.args[0])
   self.assertIn('当前选中景点：岱庙',generate.call_args.args[2])
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
 def test_all_entrypoints_use_latest_interface_and_legacy_bundles_are_retired(self):
  for path in ['/', '/index.html', '/classic', '/classic/map']:
   response=self.client.get(path+'?ui=latest',follow_redirects=False)
   self.assertEqual(response.status_code,302)
   self.assertEqual(response.headers['location'],'/experience/?ui=latest')
  for name in ['app.js','map.js','ui.js','assistant.js','style.css']:
   self.assertEqual(self.client.get('/'+name).status_code,410)
 def test_scene_artist_slots_only_enable_when_a_local_file_exists(self):
  from backend import app as service
  with tempfile.TemporaryDirectory() as tmp:
   with patch.object(service,'IMMERSIVE_DIR',Path(tmp)):
    scene=self.client.get('/api/scenes/daimiao').json();self.assertFalse(scene['model_available'])
    self.assertEqual(scene['model_url'],'/experience/models/scenes/daimiao.glb')
    model=Path(tmp)/'models/scenes/daimiao.glb';model.parent.mkdir(parents=True);model.write_bytes(b'glTF-test-slot')
    self.assertTrue(self.client.get('/api/scenes/daimiao').json()['model_available'])
    self.assertTrue(self.client.get('/api/catalog').json()['scenes'][0]['model_available'])

 def test_scene_reading_records_favorites_clear_and_other_sessions(self):
  scene=self.client.get('/api/scenes/daimiao').json()
  self.assertEqual(scene['progress'],{'viewed':[],'total':3});self.assertFalse(scene['saved'])
  self.assertTrue(all(p['sources'] for p in scene['points']))
  self.assertEqual(self.client.post('/api/scenes/daimiao/discover',json={'point_id':'invalid'}).status_code,422)
  for point in scene['points']:
   result=self.client.post('/api/scenes/daimiao/discover',json={'point_id':point['id']})
   self.assertEqual(result.status_code,200)
  self.assertEqual(len(result.json()['progress']['viewed']),3)
  again=self.client.post('/api/scenes/daimiao/discover',json={'point_id':'axis'}).json()
  self.assertEqual(len(again['progress']['viewed']),3)
  self.assertEqual(self.other.get('/api/scenes/daimiao').json()['progress']['viewed'],[])
  self.client.post('/api/journey/favorite',json={'kind':'spot','item_id':'daimiao','saved':True})
  self.assertTrue(self.client.get('/api/scenes/daimiao').json()['saved'])
  self.assertIn('daimiao',[v['spot_id'] for v in self.client.get('/api/journey').json()['visited']])
  self.client.delete('/api/journey')
  cleared=self.client.get('/api/scenes/daimiao').json();self.assertEqual(cleared['progress']['viewed'],[]);self.assertFalse(cleared['saved'])
  self.assertEqual(self.client.get('/api/scenes/missing').status_code,404)
 def test_new_scene_knowledge_is_available_to_grounded_chat(self):
  for sid,query,word in [('daimiao','岱庙的壁画讲了什么','壁画'),('caishixi','彩石溪的赤鳞鱼如何保护','赤鳞鱼'),('houshiwu','后石坞修炼传说是不是史实','传说')]:
   reply=self.client.post('/api/agent/chat',json={'message':query,'current_spot':sid}).json()
   self.assertFalse(reply['refused']);self.assertIn(word,reply['answer']);self.assertTrue(reply['sources'])
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
 def test_http_after_https_keeps_both_sessions_persistent(self):
  with TestClient(app,base_url='https://testserver') as browser:
   browser.get('/api/journey')
   secure_id=browser.cookies['taishan_session']
   browser.base_url='http://testserver'
   browser.post('/api/scenes/daimiao/discover',json={'point_id':'axis'})
   self.assertEqual(browser.get('/api/scenes/daimiao').json()['progress']['viewed'],['axis'])
   self.assertNotEqual(browser.cookies['taishan_session_http'],secure_id)
   browser.base_url='https://testserver'
   self.assertEqual(browser.get('/api/scenes/daimiao').json()['progress']['viewed'],[])
   self.assertEqual(browser.cookies['taishan_session'],secure_id)

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
 def test_coze_provider_is_reported_and_invalid_citations_fall_back(self):
  from backend import app as service
  with patch.object(service,'AGENT_PROVIDER','coze'),patch.object(service,'COZE_ENABLED',True),patch.object(service,'run_coze',AsyncMock(return_value='封禅与山岳祭祀相关[1]。')) as call:
   result=self.client.post('/api/agent/chat',json={'message':'封禅是什么'}).json()
   self.assertEqual(result['mode'],'rag_llm');self.assertEqual(result['provider'],'coze');self.assertEqual(result['model'],'Coze 智能体')
   self.assertTrue(result['citations']);self.assertIn('本轮可核对资料',call.call_args.args[2])
   self.assertEqual(self.client.get('/api/agent/history').json()[-1]['provider'],'coze')
  with patch.object(service,'AGENT_PROVIDER','coze'),patch.object(service,'COZE_ENABLED',True),patch.object(service,'run_coze',AsyncMock(return_value='无效引用[999]')):
   result=self.client.post('/api/agent/chat',json={'message':'封禅是什么'}).json()
   self.assertEqual(result['mode'],'local_knowledge_fallback');self.assertNotIn('[999]',result['answer'])
 def test_poem_questions_use_new_notes_instead_of_stale_whole_poem(self):
  from backend import app as service
  with patch.object(service,'AGENT_PROVIDER','coze'),patch.object(service,'COZE_ENABLED',True),patch.object(service,'run_coze',AsyncMock(return_value='羽人是仙人形象。[1] 鸟迹书是诗中形容古奥文字的意象。[2]')) as generate:
   r=self.client.post('/api/agent/chat',json={'message':'这首诗中的羽人和鸟迹书是什么意思？','current_poem':'libai-2'})
   self.assertEqual(r.status_code,200);a=r.json();self.assertEqual(a['mode'],'rag_llm');self.assertEqual(len(a['citations']),2)
   evidence=generate.call_args.args[2];self.assertIn('“鸟迹书”写外形古奥',evidence);self.assertNotIn('清晓骑白鹿，直上天门山。',evidence)

 def test_poem_audio_is_cached_versioned_and_uses_actual_boundaries(self):
  from backend import app as service
  from backend.speech import line_cues
  cues=line_cues(['岱宗夫如何？','齐鲁青未了。'],[
   {'text':'岱宗','offset':1000000,'duration':2000000},
   {'text':'夫如何','offset':3000000,'duration':5000000},
   {'text':'齐鲁青未了','offset':9000000,'duration':7000000}])
  self.assertEqual(cues,[{'line':0,'start':0.1,'end':0.8},{'line':1,'start':0.9,'end':1.6}])
  with self.assertRaises(ValueError):line_cues(['山','水'],[{'text':'山','offset':0,'duration':10}])
  self.assertEqual(self.client.get('/api/poems/wangyue/audio').status_code,404)
  with patch.object(service,'synthesize_poem',AsyncMock(return_value=(b'ID3real-fixture',cues))) as generate:
   a=self.client.post('/api/poems/wangyue/narration');self.assertEqual(a.status_code,200)
   self.assertEqual(a.json()['timing'],'provider_word_boundary');self.assertEqual(a.json()['cues'],cues)
   self.assertEqual(self.client.get(a.json()['audio_url']).content,b'ID3real-fixture')
   self.assertEqual(self.client.get(a.json()['audio_url']+'x').status_code,404)
   self.assertEqual(self.client.post('/api/poems/wangyue/narration').json(),a.json());self.assertEqual(generate.await_count,1)
  self.assertEqual(self.client.post('/api/poems/missing/narration').status_code,404)
  with patch.object(service,'synthesize_poem',AsyncMock(side_effect=RuntimeError('offline'))):
   self.assertEqual(self.client.post('/api/poems/libai-1/narration').status_code,503)
  for poem in CAT['poems']:
   self.assertEqual([a['line'] for a in poem['annotations']],poem['original_text'].splitlines())

 def test_tts_audio_and_failure_contract(self):
  from backend import app as service
  with patch.object(service,'TTS_AVAILABLE',True),patch.object(service,'synthesize',AsyncMock(return_value=b'ID3test-audio')) as tts:
   result=self.client.post('/api/speech/tts',json={'text':'经石峪[1]。'})
   self.assertEqual(result.status_code,200);self.assertEqual(result.headers['content-type'],'audio/mpeg');self.assertEqual(result.content,b'ID3test-audio')
   self.assertEqual(tts.call_args.args[0],'经石峪。')
  with patch.object(service,'TTS_AVAILABLE',True),patch.object(service,'synthesize',AsyncMock(side_effect=RuntimeError('provider details'))):
   result=self.client.post('/api/speech/tts',json={'text':'你好'})
   self.assertEqual(result.status_code,503);self.assertNotIn('provider details',result.text)
  self.assertEqual(self.client.post('/api/speech/tts',json={'text':''}).status_code,422)
  self.assertEqual(self.client.post('/api/speech/tts',json={'text':'山'*1501}).status_code,422)
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
  self.client.get('/api/journey');sid=self.client.cookies['taishan_session_http']
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
   self.assertTrue(all('libai-2' in d['id'] for d in result['retrieved']))
   self.assertIn('羽人指仙人',result['answer'])
   overview=self.client.post('/api/agent/chat',json={'message':'请介绍李白游泰山其一','current_poem':'libai-1'}).json()
   self.assertEqual(overview['retrieved'][0]['id'],'k-poem-libai-1')
   other=self.client.post('/api/agent/chat',json={'message':'望岳写了什么','current_poem':'libai-2'}).json()
   self.assertIn('k-poem',[d['id'] for d in other['retrieved']])
   explicit=self.client.post('/api/agent/chat',json={'message':'李白游泰山其一的天门一长啸是什么意思','current_poem':'libai-2'}).json()
   self.assertTrue(all('libai-1' in d['id'] for d in explicit['retrieved']))
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
  result=run({'status':'needs_confirmation','candidates':[{'spot_id':'yuhuang','landmark_name':'五岳独尊石刻','visible_text':'五岳独尊','reason':'可辨认岩石上竖排五岳独尊四字'}]})
  self.assertEqual(result['candidates'][0]['landmark_name'],'五岳独尊石刻')
  self.assertIn('不是同一地标',result['candidates'][0]['landmark_relation'])
  result=run({'status':'needs_confirmation','candidates':[{'spot_id':'yuhuang','landmark_name':'不存在的题刻','reason':'test'}]})
  self.assertNotIn('landmark_name',result['candidates'][0])
  result=run({'status':'needs_confirmation','candidates':[{'spot_id':'daguan','reason':'摩崖石刻'},{'spot_id':'yuhuang','landmark_name':'五岳独尊石刻','visible_text':'','reason':'仅因相邻，画面未出现'}]})
  self.assertEqual([c['spot_id'] for c in result['candidates']],['daguan'])

 def test_cloud_vision_explains_unknown_and_composites_transparency(self):
  import asyncio,base64
  from backend.cloud_vision import recognize_cloud
  output={'status':'unknown','candidates':[],'observation':'亭子与局部岩石','uncertainty_reason':'没有题字与周围地形','suggestion':'补充全景照片'}
  response=httpx.Response(200,request=httpx.Request('POST','https://example.test'),json={'choices':[{'message':{'content':json.dumps(output)}}]})
  with patch('backend.cloud_vision.httpx.AsyncClient.post',AsyncMock(return_value=response)) as post:
   result=asyncio.run(recognize_cloud(Image.new('RGBA',(64,64),(0,0,0,0)),CAT['spots'],'https://example.test','test-key','test-model','test-session'))
  self.assertEqual(result['observation'],output['observation']);self.assertEqual(result['uncertainty_reason'],output['uncertainty_reason']);self.assertEqual(result['suggestion'],output['suggestion'])
  payload=post.call_args.kwargs['json'];encoded=payload['messages'][1]['content'][1]['image_url']['url'].split(',',1)[1]
  with Image.open(io.BytesIO(base64.b64decode(encoded))) as image:self.assertTrue(all(c>245 for c in image.getpixel((0,0))))
  self.assertIn('截图或游客出现在画面中不是拒识理由',payload['messages'][0]['content'])
  output.update(observation=['invalid'],uncertainty_reason=None,suggestion='长'*500)
  response=httpx.Response(200,request=httpx.Request('POST','https://example.test'),json={'choices':[{'message':{'content':json.dumps(output)}}]})
  with patch('backend.cloud_vision.httpx.AsyncClient.post',AsyncMock(return_value=response)):
   result=asyncio.run(recognize_cloud(Image.new('RGB',(64,64)),CAT['spots'],'https://example.test','test-key','test-model','test-session'))
  self.assertEqual(result['observation'],'');self.assertTrue(result['uncertainty_reason']);self.assertEqual(len(result['suggestion']),240)

if __name__=='__main__':unittest.main()
