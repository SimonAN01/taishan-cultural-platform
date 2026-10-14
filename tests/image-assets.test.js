import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
const images=JSON.parse(readFileSync(new URL('../src/image-assets.json',import.meta.url),'utf8'));

test('every supplied image has a unique usable web asset and source trace',()=>{
 assert.equal(images.length,57);
 assert.equal(new Set(images.map(image=>image.id)).size,57);
 for(const image of images){
  assert.ok(existsSync(new URL('../public/'+image.url,import.meta.url)),image.id);
  assert.match(image.source_sha256,/^[a-f0-9]{64}$/);
  assert.equal(image.kind,'concept_art');
  assert.ok(image.width>0&&image.height>0);
  assert.ok(image.centroidXNormalized>=0&&image.centroidXNormalized<=1);
 }
 assert.equal(images.find(image=>image.id==='H-ND-18-bg').transparent,false);
 assert.equal(images.find(image=>image.id==='H-ND-18').transparent,true);
 assert.equal(images.find(image=>image.id==='H-BG-15').label,'亭台点景');
});
