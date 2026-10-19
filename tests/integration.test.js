import test from 'node:test';
import assert from 'node:assert/strict';
import { askApi, recordVisit, apiSpotId, fullSite } from '../src/integration.js';

test('immersive IDs map to valid backend IDs without inventing unsupported visits', async () => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options) => { calls.push({url, options}); return {ok:true, json:async()=>({answer:'文化资料'})}; };
  try {
    assert.equal(apiSpotId('nantianmen'), 'nantian');
    await askApi('这里有什么故事', 'nantianmen', '南天门');
    assert.equal(JSON.parse(calls[0].options.body).current_spot, 'nantian');
    assert.equal(calls[0].options.credentials, 'same-origin');
    await recordVisit('taoyuan');
    assert.equal(calls.length, 1);
    await askApi('怎么走', 'taoyuan', '桃花源');
    assert.deepEqual(JSON.parse(calls[1].options.body), {message:'桃花源：怎么走',current_spot:null});
    await recordVisit('nantianmen');
    assert.equal(calls[2].url, '/api/journey/visit');
    await askApi('有什么故事', 'stone', '五岳独尊');
    assert.deepEqual(JSON.parse(calls[3].options.body),{message:'五岳独尊：有什么故事',current_spot:null});
    assert.equal(fullSite('spot-full','nantianmen'), '/experience/#spot?id=nantian');
  } finally { globalThis.fetch = original; }
});

test('service failures remain failures instead of returning a scripted answer', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ok:false,json:async()=>({detail:'请求过于频繁'})});
  try { await assert.rejects(askApi('你是谁'), /请求过于频繁/); }
  finally { globalThis.fetch = original; }
});

test('network failures give visitors a readable retry message',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>{throw new TypeError('Failed to fetch');};
  try{await assert.rejects(askApi('泰山有什么景点'),/资料服务.*重试/);}
  finally{globalThis.fetch=original;}
});

test('image uploads let the browser set multipart boundaries and preserve cancellation', async () => {
  const {requestApi} = await import('../src/integration.js');
  const original=globalThis.fetch, form=new FormData(), controller=new AbortController();
  form.append('file',new Blob(['test'],{type:'image/png'}),'photo.png');
  globalThis.fetch=async(url,options)=>{assert.equal(url,'/api/vision/recognize');assert.equal(options.body,form);assert.equal(options.signal,controller.signal);assert.equal(options.headers['Content-Type'],undefined);return {ok:true,json:async()=>({status:'unknown'})};};
  try{assert.equal((await requestApi('vision/recognize',{method:'POST',body:form,signal:controller.signal})).status,'unknown');}finally{globalThis.fetch=original;}
});


test('proxy HTML errors become helpful upload, rate-limit and service messages', async () => {
  const {requestApi}=await import('../src/integration.js');const original=globalThis.fetch;
  try{
    for(const [status,message] of [[413,/8 MB/],[429,/频繁/],[502,/暂不可用/],[503,/繁忙/]]){
      globalThis.fetch=async()=>({ok:false,status,json:async()=>{throw new SyntaxError('HTML error');}});
      await assert.rejects(requestApi('catalog'),message);
    }
    globalThis.fetch=async()=>({ok:true,status:200,json:async()=>{throw new SyntaxError('HTML error');}});
    await assert.rejects(requestApi('catalog'),/响应异常/);
  }finally{globalThis.fetch=original;}
});


test('poetry and route guide calls retain explicit context without inventing a spot',async()=>{
  const original=globalThis.fetch;const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push(JSON.parse(options.body));return {ok:true,json:async()=>({answer:'资料'})};};
  try{await askApi('这首诗的羽人指什么？',null,null,undefined,{poem:'libai-2'});await askApi('这条路线有哪些节点？',null,null,undefined,{route:'tianwai'});assert.equal(calls[0].current_poem,'libai-2');assert.equal(calls[0].current_spot,null);assert.equal(calls[1].current_route,'tianwai');}finally{globalThis.fetch=original;}
});
