// Tests for the grown-up PIN (js/pin.js) and the family-song report (js/score.js reportText).
// Run with: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { makePin, checkPin, isPinShape } from '../js/pin.js';
import { reportText } from '../js/score.js';

test('PIN: stored as a salted hash, checked exactly', async () => {
  assert.ok(isPinShape('0429'));
  for (const bad of ['123', '12345', 'abcd', '12 4', 1234, null]) assert.ok(!isPinShape(bad), String(bad));
  const a = await makePin('0429');
  const b = await makePin('0429');
  assert.match(a.hash, /^[0-9a-f]{64}$/);
  assert.match(a.salt, /^[0-9a-f]{32}$/);
  assert.notEqual(a.salt, b.salt, 'a new salt each time');
  assert.notEqual(a.hash, b.hash);
  assert.ok(!JSON.stringify(a).includes('0429'));
  assert.equal(await checkPin(a, '0429'), true);
  assert.equal(await checkPin(b, '0429'), true);
  assert.equal(await checkPin(a, '0428'), false);
  assert.equal(await checkPin(a, '042'), false);
  assert.equal(await checkPin(null, '0429'), false);
  assert.equal(await checkPin({ salt: a.salt }, '0429'), false);
  await assert.rejects(makePin('12'));
});

test('report: a family song leaves its words out', () => {
  const step = { title: 'Shiny Sun', tonic: 60, minor: false };
  const ev = (m, text) => ({ m, text });
  const sum = {
    score: 0.8, landed: 2, total: 2, avgAbs: 10, tendency: -4, coverage: 0.9, onset: null, steadiness: null,
    all: [
      { step, ev: ev(60, 'Shi'), voiced: true, avgSigned: -5, score: 0.9 },
      { step, ev: ev(62, 'ny'), voiced: true, avgSigned: 3, score: 0.8 },
    ],
  };
  const base = { sum, range: { low: 57, high: 74 }, rangeFrom: 'test', strictKey: 'standard', date: '1 Oct 2026' };
  const open = reportText({ ...base, title: 'Shiny Sun (sung through)' });
  assert.match(open, /“Shi”/);
  const fam = reportText({ ...base, title: 'Shiny Sun (family song, sung through)', family: true });
  assert.match(fam, /Lesson: Shiny Sun \(family song, sung through\)/);
  assert.match(fam, /Shiny Sun \(family song\): C4 -5 \(90%\), D4 \+3 \(80%\)/);
  assert.ok(!/Shi”|“ny|[“”]/.test(fam), fam);
});
