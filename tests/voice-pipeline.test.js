import test from 'node:test';
import assert from 'node:assert/strict';
import { createVoicePipeline } from '../src/voice-pipeline.js';

test('first audio waits for the model, replay reuses TTS, and cancel prevents late playback',async()=>{
  const saved=new Map(['window','Audio','requestAnimationFrame','cancelAnimationFrame','fetch'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const players=[];let requests=0,resolveReady;
  let ready=new Promise(resolve=>{resolveReady=resolve;});
  const elements=new Map(['#guide-mic','#guide-mic-note','#guide-autospeak','#guide-device-voice'].map(k=>[k,{checked:true}]));
  const host={innerHTML:'',querySelector:k=>elements.get(k),append:()=>{}};
  const avatar={setAudioLevel(){},setSpeaking(){}};
  try{
    globalThis.window={isSecureContext:true};
    globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
    globalThis.fetch=async()=>{requests++;return {ok:true,blob:async()=>new Blob(['mp3'],{type:'audio/mpeg'})};};
    globalThis.Audio=class{
      constructor(){this.paused=true;players.push(this);}
      setAttribute(){}removeAttribute(){}remove(){}load(){}
      pause(){this.paused=true;this.onpause?.();}
      async play(){this.paused=false;this.onplaying?.();}
    };
    const voice=createVoicePipeline({host,input:{},getAvatar:()=>avatar,waitForAvatar:()=>ready,onStatus(){},isOpen:()=>true,isBusy:()=>false});
    const first=voice.speak('泰山');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(players.length,0,'No audio should start over the loading poster');
    resolveReady(true);await first;assert.equal(players.length,1);assert.equal(players[0].paused,false);
    voice.stop();await voice.speak('泰山');assert.equal(requests,1,'Replay must not request the same TTS again');
    ready=new Promise(resolve=>{resolveReady=resolve;});
    const next=voice.speak('红门');await new Promise(resolve=>setImmediate(resolve));
    voice.stop();resolveReady(true);await next;
    assert.equal(players.length,2,'Cancelling during model loading must discard late playback');
    voice.destroy();
  }finally{
    for(const [key,descriptor] of saved)if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});
