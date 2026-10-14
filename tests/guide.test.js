import test from 'node:test';
import assert from 'node:assert/strict';
import { answerGuide, defaultGuideQuestions, getGuideGreeting, getGuideQuestions } from '../src/guide-data.js';

test('guide offers concise starter questions', () => {
  assert.equal(defaultGuideQuestions.length, 4);
  assert.equal(getGuideQuestions('tianjie').length, 4);
  assert.match(getGuideGreeting('tianjie'), /天街/);
});

test('guide keeps place context for a general question', () => {
  const reply = answerGuide('这里有什么故事？', 'taoyuan');
  assert.match(reply.answer, /桃花源/);
  assert.equal(reply.emotion, 'look');
});

test('guide can send the visitor back to a highlighted route', () => {
  const classic = answerGuide('第一次登泰山，推荐哪条路线？');
  const western = answerGuide('桃花峪线适合什么人？');
  assert.equal(classic.routeId, 'hongmen');
  assert.equal(western.routeId, 'taohua');
});

test('guide covers summit culture and practical questions', () => {
  assert.match(answerGuide('碧霞元君与泰山有什么关系？').answer, /碧霞祠/);
  assert.match(answerGuide('在哪里看日出更合适？').answer, /日观峰/);
  assert.match(answerGuide('南天门有多高？').answer, /1460/);
});
