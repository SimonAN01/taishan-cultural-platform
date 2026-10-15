import json
import unittest
import httpx
from backend.coze_agent import run_coze,request_body,session_key,CozeError

def stream(events):
 return ''.join('event: message\ndata: '+json.dumps(e,ensure_ascii=False)+'\n\n' for e in events)

class CozeTests(unittest.IsolatedAsyncioTestCase):
 async def test_order_dedup_and_only_public_answer(self):
  events=[{'type':'thinking','content':{'thinking':'private scratchpad'}},
          {'type':'answer','sequence_id':3,'msg_id':'m','content':{'answer':'泰山[1]。'}},
          {'type':'answer','sequence_id':2,'msg_id':'m','content':{'answer':'你好，'}},
          {'type':'answer','sequence_id':2,'msg_id':'m','content':{'answer':'你好，'}},
          {'type':'tool_response','content':{'tool_response':{'secret':'internal'}}},
          {'type':'message_end','content':{'message_end':{'code':'0'}}}]
  def handler(req):
   self.assertEqual(req.headers['Authorization'],'Bearer test-only-token')
   self.assertNotIn('test-only-token',req.content.decode())
   body=json.loads(req.content)
   self.assertNotIn('project_id',body)
   self.assertEqual(body['content']['query']['prompt'][0]['content']['text'],'游客问题')
   return httpx.Response(200,headers={'Content-Type':'text/event-stream'},text=stream(events))
  result=await run_coze('https://example.coze.site/stream_run','test-only-token','游客问题','local-session',0,transport=httpx.MockTransport(handler))
  self.assertEqual(result,'你好，泰山[1]。')
 async def test_incomplete_error_and_non_stream_never_become_answers(self):
  for events in [[{'type':'answer','content':{'answer':'只返回了一半'}}],
                 [{'type':'error','content':{'error':{'message':'upstream details'}}}],
                 [{'type':'message_end','content':{'message_end':{'code':'500','message':'failed'}}}]]:
   transport=httpx.MockTransport(lambda req:httpx.Response(200,headers={'Content-Type':'text/event-stream'},text=stream(events)))
   with self.assertRaises(CozeError):await run_coze('https://example.coze.site/stream_run','test','text','session',0,transport=transport)
  transport=httpx.MockTransport(lambda req:httpx.Response(200,json={'error':'not a stream'}))
  with self.assertRaises(CozeError):await run_coze('https://example.coze.site/stream_run','test','text','session',0,transport=transport)
 def test_conversation_clear_rotates_upstream_identity(self):
  self.assertEqual(session_key('a',0),session_key('a',0))
  self.assertNotEqual(session_key('a',0),session_key('a',1))
  self.assertNotEqual(session_key('a',0),session_key('b',0))
  self.assertEqual(request_body('question','a',0,'123')['project_id'],123)
