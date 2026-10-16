import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../taishan/data/catalog.json',import.meta.url),'utf8'));
test('editorial reading paths point to existing cultural records and real poem lines',()=>{
  const ids=new Set(catalog.spots.map(s=>s.id)),sources=new Set(catalog.sources.map(s=>s.id));
  for(const spot of catalog.spots){
    assert.ok(spot.reading.observe&&spot.reading.meaning&&spot.reading.question,spot.id);
    assert.match(spot.reading.review_status,/AI.*待人工复核/);
    assert.ok(spot.source_ids.length&&spot.source_ids.every(id=>sources.has(id)),spot.id);
    assert.ok(spot.reading.related_spot_ids.length>0);
    for(const id of spot.reading.related_spot_ids)assert.ok(ids.has(id)&&id!==spot.id,`${spot.id} → ${id}`);
  }
  for(const record of catalog.history){assert.ok(record.reading.question);assert.match(record.reading.review_status,/待人工复核/);}
  for(const poem of catalog.poems){
    const lines=poem.original_text.split('\n');
    assert.equal(poem.reading_path.length,3);
    const seen=new Set();
    for(const step of poem.reading_path){
      assert.ok(Number.isInteger(step.line_index)&&lines[step.line_index]);
      assert.ok(poem.annotations.some(a=>a.line===lines[step.line_index]));
      assert.ok(!seen.has(step.line_index));seen.add(step.line_index);
    }
  }
});
