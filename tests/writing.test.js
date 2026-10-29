import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWriteQueue, buildWordQueue, writingPool, charsOf, syllableFor, outcomeForMistakes, writingSummary } from '../src/lib/writing.js';
import { defaultState, sanitize, writeIntroduce, writeAnswer } from '../src/lib/progress.js';
import { newCard } from '../src/lib/srs.js';

const V = [
  { id: 'a1', w: '态度', py: 'tài dù', s: 's1' },
  { id: 'a2', w: '面对', py: 'miàn duì', s: 's1' },
  { id: 'a3', w: '度过', py: 'dù guò', s: 's1' },
  { id: 'a4', w: '未学', py: 'wèi xué', s: 's1' },
];
const T = 20000;

test('charsOf ignores punctuation and syllableFor aligns', () => {
  assert.deepEqual(charsOf('态度，'), ['态', '度']);
  assert.equal(syllableFor(V[0], 1), 'dù');
  assert.equal(syllableFor({ w: '态度', py: 'tài' }, 0), null);
});

test('pool only holds characters from words the student has met', () => {
  const pool = writingPool(V, { 态度: newCard(T) });
  assert.deepEqual([...pool.keys()].sort(), ['态', '度'].sort());
  assert.equal(pool.get('度').id, 'a1');
});

test('queue: due characters first, then new ones, new capped per session', () => {
  const cards = { 态度: { ...newCard(T), last: T - 1 }, 面对: { ...newCard(T), last: T } };
  const wcards = { 态: { ...newCard(T - 3), b: 1, due: T - 1 } };
  const q = buildWriteQueue({ vocab: V, cards, wcards, today: T, newLimit: 2 });
  assert.equal(q[0].char, '态');
  assert.equal(q[0].intro, false);
  assert.equal(q.filter((e) => e.intro).length, 2);
  // most recently met word (面对) supplies the first new characters
  assert.deepEqual(q.filter((e) => e.intro).map((e) => e.char), ['面', '对']);
});

test('queue respects the daily new-character cap', () => {
  const cards = { 态度: newCard(T), 面对: newCard(T) };
  const q = buildWriteQueue({ vocab: V, cards, wcards: {}, today: T, introducedToday: 12 });
  assert.equal(q.length, 0);
});

test('word queue learns unseen characters and quizzes known ones', () => {
  const q = buildWordQueue(V[0], { 态: newCard(T) });
  assert.deepEqual(q.map((e) => [e.char, e.intro]), [['态', false], ['度', true]]);
});

test('mistakes map to SRS outcomes', () => {
  assert.equal(outcomeForMistakes(0), 'good');
  assert.equal(outcomeForMistakes(2), 'hint');
  assert.equal(outcomeForMistakes(3), 'again');
});

test('introduce then answer updates the writing track, not the word cards', () => {
  let s = writeIntroduce(defaultState(), '态', T);
  assert.equal(s.writing.cards['态'].due, T + 1);
  assert.equal(s.writing.intro.n, 1);
  s = writeAnswer(s, '态', 'again', T + 1);
  assert.equal(s.writing.cards['态'].bad, 1);
  assert.deepEqual(s.cards, {});
  assert.equal(s.writing.log[T + 1][0], 1);
});

test('a few answers count as a study day', () => {
  let s = defaultState();
  for (let i = 0; i < 4; i++) s = writeAnswer(s, '态', 'good', T);
  assert.ok(s.days.includes(T));
});

test('sanitize keeps valid writing data and drops junk', () => {
  const raw = defaultState();
  raw.writing.cards['态'] = newCard(T);
  raw.writing.cards['abc'] = newCard(T);
  raw.writing.cards['度'] = { b: 99, due: 'x' };
  const clean = sanitize(JSON.parse(JSON.stringify(raw)));
  assert.ok(clean.writing.cards['态']);
  assert.ok(!clean.writing.cards['abc']);
  assert.equal(clean.writing.cards['度'].b, 5);
  assert.equal(clean.writing.cards['度'].due, 0);
});

test('writingSummary reports started, secure, weak', () => {
  let s = defaultState();
  s = writeIntroduce(s, '态', T);
  s = writeAnswer(s, '态', 'again', T + 1);
  s = writeIntroduce(s, '度', T);
  const w = writingSummary(s, T + 1);
  assert.equal(w.started, 2);
  assert.equal(w.secure, 0);
  assert.deepEqual(w.weak, ['态']);
  assert.equal(w.acc7, 0);
});
