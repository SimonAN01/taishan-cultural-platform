"""Coze deployed-agent SSE adapter. Never expose upstream auth or tool events."""
import asyncio
import hashlib
import json
from urllib.parse import urlparse
import httpx

class CozeError(ValueError):
    pass


def session_key(local_session, revision):
    # A cleared local conversation starts a separate upstream conversation, too.
    return 'taishan-'+hashlib.sha256(f'{local_session}:{revision}'.encode()).hexdigest()[:40]


def request_body(prompt, local_session, revision, project_id=''):
    body={'type':'query','session_id':session_key(local_session,revision),
          'content':{'query':{'prompt':[{'type':'text','content':{'text':prompt}}]}}}
    if project_id:body['project_id']=int(project_id)
    return body


async def run_coze(url, token, prompt, local_session, revision, project_id='', transport=None):
    parsed=urlparse(url)
    if parsed.scheme!='https' or not parsed.hostname or parsed.username or parsed.password:
        raise CozeError('invalid Coze URL')
    body=request_body(prompt,local_session,revision,project_id)
    parts=[]; seen=set(); completed=False; total=0
    async def consume():
        nonlocal completed,total
        async with httpx.AsyncClient(timeout=httpx.Timeout(45,connect=10),transport=transport,follow_redirects=False) as client:
            async with client.stream('POST',url,headers={'Authorization':'Bearer '+token,'Accept':'text/event-stream'},json=body) as response:
                response.raise_for_status()
                if 'text/event-stream' not in response.headers.get('content-type',''):
                    raise CozeError('Coze did not return an event stream')
                data=[]
                def event(lines):
                    nonlocal completed,total
                    try: item=json.loads('\n'.join(lines))
                    except (ValueError,TypeError):raise CozeError('invalid Coze event') from None
                    if not isinstance(item,dict):raise CozeError('invalid Coze event')
                    content=item.get('content') or {};kind=item.get('type')
                    if kind=='error' or content.get('error'):raise CozeError('Coze execution failed')
                    if kind=='answer':
                        answer=content.get('answer');sequence=item.get('sequence_id')
                        key=(item.get('msg_id'),sequence)
                        if sequence is None or key not in seen:
                            if sequence is not None:seen.add(key)
                            if isinstance(answer,str):
                                total+=len(answer)
                                if total>12000:raise CozeError('Coze answer too long')
                                parts.append((sequence if isinstance(sequence,int) else len(parts),answer))
                    if kind=='message_end':
                        end=content.get('message_end') or {}
                        if str(end.get('code'))!='0':raise CozeError('Coze execution failed')
                        completed=True
                async for line in response.aiter_lines():
                    if len(line)>100000:raise CozeError('Coze event too large')
                    if line.startswith('data:'):data.append(line[5:].lstrip())
                    elif not line and data:
                        event(data);data=[]
                        if completed:break
                if data and not completed:event(data)
    await asyncio.wait_for(consume(),timeout=55)
    answer=''.join(text for _,text in sorted(parts,key=lambda part:part[0])).strip()
    if not completed or not answer:raise CozeError('incomplete Coze answer')
    return answer
