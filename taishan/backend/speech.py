"""Bounded hosted TTS; no speech model weights on the web server."""
import asyncio
import bisect
import importlib.util
import re

AVAILABLE=importlib.util.find_spec('edge_tts') is not None
VOICE='zh-CN-XiaoxiaoNeural'
SEMAPHORE=asyncio.Semaphore(2)

async def generate(text,boundary='SentenceBoundary'):
    if not AVAILABLE:raise RuntimeError('TTS is not installed')
    import edge_tts
    await asyncio.wait_for(SEMAPHORE.acquire(),timeout=3)
    try:
        async def receive():
            chunks=[];events=[];size=0
            async for event in edge_tts.Communicate(text,VOICE,rate='-10%',boundary=boundary).stream():
                if event['type']=='audio':
                    size+=len(event['data'])
                    if size>6*1024*1024:raise ValueError('audio too large')
                    chunks.append(event['data'])
                elif event['type']=='WordBoundary':events.append(event)
            if not chunks:raise ValueError('empty speech')
            return b''.join(chunks),events
        return await asyncio.wait_for(receive(),timeout=30)
    finally:SEMAPHORE.release()

async def synthesize(text):
    audio,_=await generate(text)
    return audio

def line_cues(lines,events):
    """Map actual provider word offsets (100ns) to the original display lines."""
    compact=lambda s:''.join(re.findall(r'\w',s))
    parts=[compact(line) for line in lines];text=''.join(parts)
    ends=[];total=0
    for part in parts:total+=len(part);ends.append(total)
    cues=[{'line':i,'start':None,'end':None} for i in range(len(lines))];cursor=0
    for event in events:
        word=compact(event['text'])
        if not word:continue
        start=text.find(word,cursor)
        if start<0:continue
        finish=start+len(word);cursor=finish
        for i in range(bisect.bisect_right(ends,start),min(len(lines),bisect.bisect_left(ends,finish)+1)):
            cue=cues[i];a=event['offset']/10_000_000;b=(event['offset']+event['duration'])/10_000_000
            cue['start']=a if cue['start'] is None else min(cue['start'],a)
            cue['end']=b if cue['end'] is None else max(cue['end'],b)
    if any(c['start'] is None for c in cues):raise ValueError('Incomplete speech timing')
    return cues

async def synthesize_poem(lines):
    audio,events=await generate('\n'.join(lines),'WordBoundary')
    return audio,line_cues(lines,events)
