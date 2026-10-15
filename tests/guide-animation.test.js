import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('rendering an answer never triggers a gesture, with or without an emotion field', () => {
  // Execute the actual renderer in a small DOM harness; no WebGL/network needed.
  const source = readFileSync(new URL('../src/home.js', import.meta.url), 'utf8');
  const render = source.slice(source.indexOf('function showGuideAnswer('), source.indexOf("\nlet lastGuideQuestion"));
  const gestures = [], spoken = [], answer = {}, route = {}, speaker = {};
  const context = {
    guideAnswer: answer, guideRouteLink: route,
    guideAvatar: { gesture: value => gestures.push(value) },
    speakGuide: text => spoken.push(text),
    document: { querySelector: selector => selector === '#guide-sources' ? { replaceChildren() {} } : speaker },
  };
  runInNewContext(render + '\nthis.render = showGuideAnswer;', context);
  for (const emotion of [undefined, 'nod', 'look', 'bow']) {
    context.render({ answer: '泰山文化讲解', emotion }, false);
    assert.equal(answer.textContent, '泰山文化讲解');
    assert.equal(context.guideLastAnswer, '泰山文化讲解');
  }
  context.render({ answer: '开始朗读' }, true);
  assert.deepEqual(spoken, ['开始朗读']);
  assert.deepEqual(gestures, [], 'Only the explicit gesture buttons should trigger a one-shot gesture');
});
