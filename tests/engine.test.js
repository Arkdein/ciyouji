import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newCard, applyReview, statusOf, INTERVALS } from '../src/lib/srs.js';
import { newStreak, recordStudyDay, effectiveStreak, weekDots } from '../src/lib/streak.js';
import { mulberry32, buildExercise, kindForCard, checkTyped, canCloze } from '../src/lib/exercises.js';
import { introOrder, buildQueue, canonicalMap, SESSION_SIZE } from '../src/lib/session.js';
import { coverage, paceInfo, accuracy } from '../src/lib/stats.js';
import { dayNumber, dayFromIso, isoFromDay, weekStart } from '../src/lib/dates.js';

const vocab = JSON.parse(readFileSync(new URL('../src/data/vocab.json', import.meta.url), 'utf8'));
const T = 20000; // an arbitrary "today"

test('dataset: 635 entries, unique ids, expected lists', () => {
  assert.equal(vocab.length, 635);
  assert.equal(new Set(vocab.map((v) => v.id)).size, 635);
  assert.equal(vocab.filter((v) => v.t === 'i').length, 50);
  for (const s of ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9']) {
    assert.equal(vocab.filter((v) => v.s === s).length, 65, s);
  }
});

test('dates: iso round trip and Monday week start', () => {
  const d = dayFromIso('2026-10-29');
  assert.equal(isoFromDay(d), '2026-10-29');
  assert.equal(new Date(weekStart(d) * 86400000).getUTCDay(), 1); // Monday
  assert.equal(dayNumber(new Date(2026, 9, 29)), d);
});

test('srs: climbing, no early promotion, drops, hints', () => {
  let c = newCard(T);
  c = applyReview(c, 'good', T);
  assert.equal(c.b, 1);
  assert.equal(c.due, T + INTERVALS[1]);
  const before = c;
  c = applyReview(c, 'good', T); // not due again today → no promotion
  assert.equal(c.b, before.b);
  assert.equal(c.due, before.due);
  let d = { ...newCard(T), b: 4, due: T };
  d = applyReview(d, 'again', T);
  assert.equal(d.b, 2);
  assert.equal(d.lapses, 1);
  assert.equal(d.due, T);
  let h = { ...newCard(T), b: 3, due: T };
  h = applyReview(h, 'hint', T);
  assert.equal(h.b, 3);
  assert.equal(h.due, T + 1);
  let top = { ...newCard(T), b: 4, due: T };
  top = applyReview(top, 'good', T);
  assert.equal(statusOf(top), 'secure');
  assert.equal(top.due, T + 16);
  assert.equal(statusOf(undefined), 'new');
});

test('streak: consecutive days, rest-day bridge, reset, earned freeze', () => {
  let s = newStreak();
  s = recordStudyDay(s, T);
  s = recordStudyDay(s, T + 1);
  assert.equal(s.count, 2);
  assert.equal(recordStudyDay(s, T + 1), s); // idempotent
  // miss one day with a banked freeze → streak survives
  const bridged = recordStudyDay(s, T + 3);
  assert.equal(bridged.count, 3);
  assert.equal(bridged.freezes, 0);
  // miss two days with no freezes → reset
  const reset = recordStudyDay(bridged, T + 6);
  assert.equal(reset.count, 1);
  // effectiveStreak previews without mutating
  assert.equal(effectiveStreak(s, T + 2), 2);
  assert.equal(effectiveStreak(s, T + 3), 2); // one missed day, one freeze
  assert.equal(effectiveStreak(s, T + 5), 0);
  // 7th day earns a freeze (capped at 2)
  let r = newStreak();
  for (let i = 0; i < 7; i++) r = recordStudyDay(r, T + i);
  assert.equal(r.count, 7);
  assert.equal(r.freezes, 2);
  const dots = weekDots([weekStart(T), weekStart(T) + 2], weekStart(T) + 3);
  assert.deepEqual(dots, [true, false, true, false, false, false, false]);
});

test('exercises: every item builds every applicable kind with exactly one correct option', () => {
  const rng = mulberry32(7);
  for (const item of vocab) {
    for (const kind of ['mcDef', 'mcWord', 'cloze']) {
      if (kind === 'cloze' && !canCloze(item)) continue;
      const ex = buildExercise({ item, kind, vocab, rng });
      assert.equal(ex.options.length, 4, `${item.id} ${kind}`);
      assert.equal(ex.options.filter((o) => o.correct).length, 1, `${item.id} ${kind}`);
      assert.equal(new Set(ex.options.map((o) => o.label)).size, 4, `${item.id} ${kind} duplicate options`);
      if (kind === 'cloze') {
        assert.ok(ex.sentence.includes('＿＿＿＿'));
        assert.ok(!ex.sentence.includes(item.w));
        for (const o of ex.options) {
          if (!o.correct) assert.ok(!item.ex.includes(o.label), `${item.id}: distractor ${o.label} appears in sentence`);
        }
      }
    }
  }
});

test('exercises: kinds progress from recognition to production; audio optional', () => {
  const item = vocab[0];
  const rng = mulberry32(1);
  const kinds = (b, audioOk) => {
    const out = new Set();
    for (let i = 0; i < 200; i++) out.add(kindForCard({ ...newCard(T), b }, item, { audioOk, rng }));
    return out;
  };
  assert.deepEqual([...kinds(0, true)], ['mcDef']);
  assert.ok(kinds(4, true).has('dictation'));
  assert.ok(!kinds(4, false).has('dictation'));
  assert.ok(kinds(5, false).has('type'));
});

test('checkTyped: characters, pinyin, punctuation, wrong', () => {
  const it = { w: '一蹶不振' };
  assert.equal(checkTyped('一蹶不振', it), 'correct');
  assert.equal(checkTyped(' 一蹶 不振。', it), 'correct');
  assert.equal(checkTyped('yi jue bu zhen', it), 'pinyin');
  assert.equal(checkTyped('一筹莫展', it), 'wrong');
  assert.equal(checkTyped('', it), 'wrong');
});

test('session: intro order covers every headword once, spread across lists', () => {
  const order = introOrder(vocab);
  const unique = new Set(vocab.map((v) => v.w));
  assert.equal(order.length, unique.size);
  assert.equal(new Set(order.map((o) => o.w)).size, unique.size);
  const firstTwenty = new Set(order.slice(0, 20).map((o) => o.s));
  assert.ok(firstTwenty.size >= 8, 'early words should come from many lists');
  assert.ok(order.slice(0, 20).some((o) => o.t === 'i'), 'idioms appear early');
});

test('session: daily queue rules', () => {
  const rng = mulberry32(3);
  // brand-new student: 5 new words, no reviews
  let q = buildQueue({ vocab, cards: {}, today: T, newLimit: 5, rng });
  assert.equal(q.length, 5);
  assert.ok(q.every((e) => e.intro));
  // quota already used up → nothing to do
  q = buildQueue({ vocab, cards: {}, today: T, newLimit: 5, introducedToday: 5, rng });
  assert.equal(q.length, 0);
  // backlog bigger than a session → reviews only, capped, no new words
  const cards = {};
  vocab.slice(0, 30).forEach((v) => (cards[v.w] = { ...newCard(T - 5), b: 1, due: T - 1 }));
  q = buildQueue({ vocab, cards, today: T, newLimit: 5, rng });
  assert.equal(q.length, SESSION_SIZE);
  assert.ok(q.every((e) => !e.intro));
  // a few due + new quota → mixed, no duplicate keys
  const few = {};
  vocab.slice(0, 4).forEach((v) => (few[v.w] = { ...newCard(T - 5), b: 1, due: T }));
  q = buildQueue({ vocab, cards: few, today: T, newLimit: 5, rng });
  assert.equal(q.filter((e) => e.intro).length, 5);
  assert.equal(q.filter((e) => !e.intro).length, 4);
  assert.equal(new Set(q.map((e) => e.key)).size, q.length);
  // focus list is introduced first
  q = buildQueue({ vocab, cards: {}, today: T, newLimit: 5, focus: 's7', rng });
  const canon = canonicalMap(vocab);
  assert.ok(q.every((e) => canon.get(e.key).s === 's7'));
  // revision window: no new words, weakest not-due words come in
  const secure = {};
  vocab.slice(0, 10).forEach((v, i) => (secure[v.w] = { ...newCard(T), b: 3, due: T + 5, bad: i, lapses: i % 3 }));
  q = buildQueue({ vocab, cards: secure, today: T, newLimit: 5, examDays: 10, rng });
  assert.ok(q.length > 0 && q.every((e) => !e.intro));
});

test('session: strand and weak modes', () => {
  const rng = mulberry32(5);
  const q = buildQueue({ vocab, cards: {}, today: T, mode: 'strand', strand: 's4', rng });
  assert.equal(q.length, 3);
  assert.ok(q.every((e) => vocab.find((v) => v.id === e.itemId).s === 's4'));
  const cards = { [vocab[0].w]: { ...newCard(T), b: 1, bad: 3, lapses: 1, due: T + 3 } };
  const weak = buildQueue({ vocab, cards, today: T, mode: 'weak', rng });
  assert.equal(weak.length, 1);
});

test('stats: coverage totals, accuracy window, pace', () => {
  const cards = { [vocab[0].w]: { ...newCard(T), b: 5 }, [vocab[1].w]: { ...newCard(T), b: 2 } };
  const { overall, byStrand } = coverage(vocab, cards);
  assert.equal(overall.total, new Set(vocab.map((v) => v.w)).size);
  assert.equal(overall.secure, 1);
  assert.equal(overall.reviewing, 1);
  assert.equal(byStrand.s1.total, 65);
  assert.deepEqual(accuracy({ [T]: [10, 8], [T - 3]: [10, 5], [T - 9]: [10, 10] }, T, 7), { answered: 20, correct: 13, pct: 65 });
  assert.equal(paceInfo({ untouched: 500, newPerDay: 5, examDays: null }).state, 'noDate');
  assert.equal(paceInfo({ untouched: 500, newPerDay: 5, examDays: 60 }).state, 'behind');
  assert.equal(paceInfo({ untouched: 100, newPerDay: 5, examDays: 60 }).state, 'onTrack');
  assert.equal(paceInfo({ untouched: 100, newPerDay: 5, examDays: 10 }).state, 'revision');
});

import { defaultState, sanitize, answerCard, introduceCard, introducedToday, STUDY_DAY_ANSWERS } from '../src/lib/progress.js';
import { summarise, progressCode, formFields } from '../src/lib/report.js';

test('progress: intro quota, study-day threshold, streak wiring', () => {
  let s = defaultState();
  s = introduceCard(s, '态度', T);
  s = introduceCard(s, '态度', T); // idempotent
  assert.equal(introducedToday(s, T), 1);
  assert.equal(introducedToday(s, T + 1), 0);
  for (let i = 0; i < STUDY_DAY_ANSWERS - 1; i++) s = answerCard(s, '态度', 'good', T);
  assert.equal(s.days.length, 0);
  s = answerCard(s, '态度', 'again', T);
  assert.deepEqual(s.days, [T]);
  assert.equal(s.streak.count, 1);
  assert.deepEqual(s.log[T], [STUDY_DAY_ANSWERS, STUDY_DAY_ANSWERS - 1]);
});

test('progress: sanitize rejects junk and keeps good data', () => {
  assert.deepEqual(sanitize(null), defaultState());
  const dirty = { profile: { cls: 'x'.repeat(99) }, settings: { newPerDay: 99 }, cards: { 好: { b: 9, due: 'x' }, bad: 5 }, days: [3, 'a', 3, 1] };
  const s = sanitize(dirty);
  assert.equal(s.profile.cls.length, 20);
  assert.equal(s.settings.newPerDay, 5);
  assert.equal(s.cards['好'].b, 5);
  assert.equal(s.cards['好'].due, 0);
  assert.ok(!('bad' in s.cards));
  assert.deepEqual(s.days, [1, 3]);
});

test('report: summary, code and form fields', () => {
  const strands = [{ id: 's1', num: 1, cn: 'x' }, { id: 'idiom', num: 10, cn: 'y' }];
  let st = defaultState();
  st.profile = { name: '陈小明', cls: '24S53', idx: '07' };
  st = introduceCard(st, vocab[0].w, T);
  st = answerCard(st, vocab[0].w, 'again', T);
  const sum = summarise(st, vocab, strands, T);
  assert.equal(sum.cls, '24S53');
  assert.equal(sum.lists.length, 2);
  assert.equal(sum.total, new Set(vocab.map((v) => v.w)).size);
  assert.deepEqual(sum.weak, [vocab[0].w]);
  const code = progressCode(sum);
  assert.match(code, /^H1VS2\|/);
  assert.equal(sum.name, '陈小明');
  const f = formFields(sum, { name: 'entry.0', cls: 'entry.1', idx: 'entry.2', code: 'entry.9', missing: '' });
  assert.equal(f['entry.0'], '陈小明');
  assert.equal(f['entry.1'], '24S53');
  assert.equal(f['entry.2'], '07');
  assert.equal(f['entry.9'], code);
  assert.equal(Object.keys(f).length, 4);
});
