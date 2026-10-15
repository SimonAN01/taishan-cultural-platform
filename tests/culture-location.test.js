import test from 'node:test';
import assert from 'node:assert/strict';
import { cultureHash, readCultureLocation } from '../src/culture-location.js';

test('content links retain route transport, era, poem and spot reading state', () => {
  const route=cultureHash('routes',{id:'tianwai',variant:'cable'});
  assert.equal(route,'#routes?id=tianwai&variant=cable');
  assert.equal(readCultureLocation(route).variant,'cable');
  const era=cultureHash('history',{era:'唐宋'});
  assert.equal(readCultureLocation(era).era,'唐宋');
  assert.equal(readCultureLocation(cultureHash('poetry',{id:'libai-2'})).id,'libai-2');
  assert.deepEqual(readCultureLocation(cultureHash('spot',{id:'nantian',tab:'poetry',point:'',photo:1})),
    {page:'spot',id:'nantian',variant:'walk',era:'先秦',tab:'poetry',point:'',photo:1});
  assert.equal(cultureHash('agent',{id:'nantian'}),'#agent?id=nantian');
  assert.equal(readCultureLocation(cultureHash('scene',{id:'houshiwu',point:'legend'})).point,'legend');
  assert.equal(cultureHash('map',{id:'nantian'}),'#map');
});

test('malformed locations cannot introduce invalid eras, tabs or negative photo indices', () => {
  assert.equal(readCultureLocation('#not-a-page'),null);
  const state=readCultureLocation('#spot?id=%E5%8D%97%E5%A4%A9%E9%97%A8&era=missing&tab=missing&photo=-1');
  assert.equal(state.id,'南天门');assert.equal(state.era,'先秦');assert.equal(state.tab,'history');assert.equal(state.photo,0);
});
