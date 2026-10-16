import test from 'node:test';
import assert from 'node:assert/strict';
import {artworkCameraDistance} from '../src/scene-framing.js';
test('concept artwork fits both narrow phones and wide desktop viewports',()=>{
  for(const height of [5.2,4.3])for(const aspect of [.75,.9,1,1.4,2.4]){
    const distance=artworkCameraDistance(aspect,38,8.2,height),visibleHeight=2*distance*Math.tan(38*Math.PI/360);
    assert.ok(visibleHeight>height&&visibleHeight*aspect>8.2,`clipped at aspect ${aspect}`);
  }
  assert.ok(artworkCameraDistance(.9)>artworkCameraDistance(1.4));
});
