"""Bounded hosted TTS; no speech model weights on the web server."""
import asyncio
import importlib.util

AVAILABLE=importlib.util.find_spec('edge_tts') is not None
VOICE='zh-CN-XiaoxiaoNeural'
SEMAPHORE=asyncio.Semaphore(2)

async def synthesize(text):
    if not AVAILABLE:raise RuntimeError('TTS is not installed')
    import edge_tts
    await asyncio.wait_for(SEMAPHORE.acquire(),timeout=3)
    try:
        async def generate():
            chunks=[];size=0
            async for event in edge_tts.Communicate(text,VOICE,rate='-10%').stream():
                if event['type']=='audio':
                    size+=len(event['data'])
                    if size>6*1024*1024:raise ValueError('audio too large')
                    chunks.append(event['data'])
            if not chunks:raise ValueError('empty speech')
            return b''.join(chunks)
        return await asyncio.wait_for(generate(),timeout=30)
    finally:SEMAPHORE.release()
