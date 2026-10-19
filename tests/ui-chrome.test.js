import test from 'node:test';
import assert from 'node:assert/strict';
import { activeDestination, normalizePreferences } from '../src/ui-chrome.js';

test('reading and scene deep links keep the correct main destination selected', () => {
  for (const page of ['read','poetry','history','museum']) assert.equal(activeDestination(page),'read');
  for (const [page,destination] of [['scene','scenes'],['scenes','scenes'],['spot','map'],['gallery','read'],['study','read'],['routes','map'],['vision','agent']]) assert.equal(activeDestination(page),destination);
});

test('stored presentation preferences reject invalid values and clamp audio volume', () => {
  assert.deepEqual(normalizePreferences(null),{autoSpeak:true,captions:true,volume:.8});
  assert.deepEqual(normalizePreferences({autoSpeak:false,captions:false,volume:3}),{autoSpeak:false,captions:false,volume:1});
  assert.deepEqual(normalizePreferences({autoSpeak:'yes',captions:0,volume:NaN}),{autoSpeak:true,captions:true,volume:.8});
  assert.equal(normalizePreferences({volume:-.5}).volume,0);
});
