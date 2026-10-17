import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {cultureHash,readCultureLocation} from '../src/culture-location.js';
const scenes=JSON.parse(readFileSync(new URL('../taishan/data/scenes.json',import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL('../taishan/data/catalog.json',import.meta.url)));
const assets=JSON.parse(readFileSync(new URL('../src/image-assets.json',import.meta.url)));

test('three cultural scenes have real asset paths, sourced reading points and navigable links',()=>{
  assert.deepEqual(scenes.map(s=>s.id),['daimiao','caishixi','houshiwu']);
  for(const s of scenes){
    const spot=catalog.spots.find(p=>p.id===s.spot_id);assert.ok(spot);assert.equal(spot.map_visible,false);assert.equal(spot.vision_enabled,s.id==='daimiao');if(spot.vision_enabled)assert.ok(spot.vision_prompt);
    assert.equal(s.points.length,3);assert.equal(new Set(s.points.map(p=>p.id)).size,3);
    for(const id of s.asset_ids){const asset=assets.find(a=>a.id===id);assert.ok(asset,id);assert.ok(existsSync(new URL('../public/'+asset.url,import.meta.url)));}
    assert.ok(!s.asset_ids.includes('H-BG-15'),'The pavilion mislabeled as Daimiao must not become a false temple background');
    for(const p of s.points){assert.ok(p.source_ids.length);assert.ok(p.source_ids.every(id=>catalog.sources.some(s=>s.id===id)));assert.ok(p.x>0&&p.x<100&&p.y>0&&p.y<100);assert.ok(p.question.includes(s.name));assert.equal(readCultureLocation(cultureHash('scene',{id:s.id,point:p.id})).point,p.id);}
    for(const id of s.related_spots)assert.ok(catalog.spots.some(p=>p.id===id));
    if(s.related_route)assert.ok(catalog.routes.some(r=>r.id===s.related_route));
  }
  assert.match(scenes[2].points.find(p=>p.id==='legend').kind,/传说/);
});
