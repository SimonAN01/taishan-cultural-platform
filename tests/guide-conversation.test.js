import test from 'node:test';import assert from 'node:assert/strict';
import {resolveGuideContext,guideTurns,groupGuideTurns} from '../src/guide-conversation.js';
const catalog={spots:[{id:'hongmen',name:'红门',alias:[]},{id:'shibapan',name:'十八盘',alias:[]}],poems:[{id:'wangyue',title:'望岳'}],routes:[]};
test('an explicit place overrides selection while deictic here keeps it',()=>{
 const red=resolveGuideContext('红门有什么故事？',catalog,'shibapan');assert.equal(red.spotId,'hongmen');
 assert.equal(resolveGuideContext('这里有什么故事？',catalog,'shibapan',{},red).spotId,'shibapan');
 assert.equal(resolveGuideContext('继续讲它的故事',catalog,'shibapan',{},red).spotId,'hongmen');
 assert.equal(resolveGuideContext('红门和十八盘有什么不同？',catalog,'shibapan').label,'红门、十八盘');
 assert.equal(resolveGuideContext('这首诗写了什么？',catalog,null,{poem:'wangyue'}).label,'望岳');
});
test('history pairs complete answers and groups duplicate questions without dropping turns',()=>{
 const rows=[{role:'assistant',text:'孤立回答'},{role:'user',text:'红门有什么故事？',spot_id:'shibapan'},{role:'assistant',text:'回答一',sources:[{title:'资料'}]},{role:'user',text:'红门有什么故事？'},{role:'assistant',text:'回答二'},{role:'user',text:'未完成问题'}];
 const turns=guideTurns(rows,catalog);assert.equal(turns.length,2);assert.equal(turns[0].context.spotId,'hongmen');assert.equal(turns[0].reply.sources.length,1);assert.equal(groupGuideTurns(turns)[0].length,2);assert.equal(groupGuideTurns(turns)[0][0].reply.text,'回答二');
});
