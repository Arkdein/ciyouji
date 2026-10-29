import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultState, sanitize, answerCard, introduceCard, markStudied, finishSession, writeIntroduce, writeAnswer } from '../src/lib/progress.js';
import { XP, rankInfo, rankIndex, RANKS, awardStickers, dismissCelebration, nextCelebration, stickerCount, sanitizeGame, xpToday } from '../src/lib/game.js';
import { STICKERS, STICKER_BY_ID, buildContext, metStickers, STAMP_AT } from '../src/lib/stickers.js';
import { readFileSync } from 'node:fs';

// StickerArt is JSX, so check its registry by reading the source: every sticker id needs an `id: {` entry.
const ART_SRC = readFileSync(new URL('../src/components/StickerArt.jsx', import.meta.url), 'utf8');
const STICKER_IDS = [...ART_SRC.matchAll(/^  ([a-z0-9]+): \{ bg:/gm)].map((m) => m[1]);

const T = 20000;
const vocab = [
  { id: 1, w: '甲乙', s: 's1', py: 'jia yi' }, { id: 2, w: '丙丁', s: 's1', py: 'bing ding' },
  { id: 3, w: '戊己', s: 's1', py: 'wu ji' }, { id: 4, w: '庚辛', s: 's1', py: 'geng xin' },
  { id: 5, w: '壬癸', s: 's2', py: 'ren gui' },
];

test('xp: correct, hint and miss pay different amounts and are logged per day', () => {
  let s = introduceCard(defaultState(), '甲乙', T);
  assert.equal(s.game.xp, XP.meet);
  s = answerCard(s, '甲乙', 'good', T);
  s = answerCard(s, '甲乙', 'hint', T);
  s = answerCard(s, '甲乙', 'again', T);
  assert.equal(s.game.xp, XP.meet + XP.good + XP.hint + XP.again);
  assert.equal(xpToday(s, T), s.game.xp);
  assert.equal(xpToday(s, T + 1), 0);
});

test('ranks: thresholds and progress to the next rank', () => {
  assert.equal(rankIndex(0), 0);
  assert.equal(rankIndex(299), 0);
  assert.equal(rankIndex(300), 1);
  assert.equal(rankIndex(99999), RANKS.length - 1);
  const i = rankInfo(600);
  assert.equal(i.rank.cn, '旅人');
  assert.equal(i.next.cn, '探路人');
  assert.equal(i.left, 300);
  assert.equal(i.pct, 50);
  assert.equal(rankInfo(99999).pct, 100);
});

test('rank-up queues exactly one celebration per rank reached', () => {
  let s = defaultState();
  s = { ...s, game: { ...s.game, xp: 290 } };
  s = introduceCard(s, '甲乙', T); // +5 -> 295
  assert.equal(nextCelebration(s), null);
  s = answerCard(s, '甲乙', 'good', T); // 305 -> rank 1
  assert.equal(nextCelebration(s), 'rank:1');
  s = dismissCelebration(s);
  assert.equal(nextCelebration(s), null);
});

test('study day, session finish and perfect-run flag', () => {
  let s = markStudied(defaultState(), T);
  assert.equal(s.game.xp, XP.studyDay);
  assert.equal(markStudied(s, T).game.xp, XP.studyDay); // only once a day
  s = finishSession(s, { answered: 10, correct: 10 }, T);
  assert.equal(s.game.xp, XP.studyDay + XP.session);
  assert.ok(s.game.flags.perfect);
  const t = finishSession(defaultState(), { answered: 10, correct: 9 }, T);
  assert.ok(!t.game.flags.perfect);
  assert.equal(finishSession(defaultState(), { answered: 0, correct: 0 }, T).game.xp, 0);
});

test('comeback flag after 4+ days away, not after a short gap', () => {
  let s = { ...defaultState(), days: [T - 10] };
  assert.ok(markStudied(s, T).game.flags.comeback);
  s = { ...defaultState(), days: [T - 3] };
  assert.ok(!markStudied(s, T).game.flags.comeback);
});

test('stop sticker is earned at the stamp threshold and pays XP once', () => {
  let s = defaultState();
  const secure = (w) => ({ b: 5, due: T + 9, seen: 5, ok: 5, bad: 0, lapses: 0, hint: 0, last: T });
  s.cards = { 甲乙: secure(), 丙丁: secure(), 戊己: secure() }; // 3 of 4 = 75%, below 80%
  s = awardStickers(s, vocab, T);
  assert.ok(!('s1' in s.game.stickers));
  s.cards['庚辛'] = secure(); // 100%
  s = awardStickers(s, vocab, T);
  assert.equal(s.game.stickers.s1, T);
  assert.ok(nextCelebration(s)?.startsWith('sticker:'));
  const xp = s.game.xp;
  s = awardStickers(s, vocab, T);
  assert.equal(s.game.xp, xp); // idempotent
  assert.ok(STAMP_AT === 0.8);
});

test('writing stickers: first trace, clean writing day', () => {
  let s = writeIntroduce(defaultState(), '甲', T);
  s = awardStickers(s, vocab, T);
  assert.ok('write1' in s.game.stickers);
  for (let i = 0; i < 10; i++) s = writeAnswer(s, '甲', 'good', T);
  s = awardStickers(s, vocab, T);
  assert.ok('writeday' in s.game.stickers);
});

test('exam stickers need an exam date and a study day', () => {
  let s = { ...defaultState(), exam: { date: new Date((T + 20) * 86400000).toISOString().slice(0, 10) } };
  assert.ok(!metStickers(buildContext(s, vocab, T)).includes('exam100')); // not studied today
  s = { ...s, days: [T] };
  const got = metStickers(buildContext(s, vocab, T));
  assert.ok(got.includes('exam100') && got.includes('exam30'));
});

test('every sticker has art, unique id, and both languages', () => {
  assert.equal(new Set(STICKERS.map((x) => x.id)).size, STICKERS.length);
  for (const st of STICKERS) {
    assert.ok(STICKER_IDS.includes(st.id), `no art for ${st.id}`);
    assert.ok(st.cn && st.en && st.how.cn && st.how.en);
  }
  assert.equal(STICKER_IDS.length, STICKERS.length);
  assert.ok(STICKER_BY_ID.journey);
});

test('game state survives sanitize and rejects junk', () => {
  const g = sanitizeGame({ xp: -5, rank: 99, stickers: { first: 5, bad: 'x' }, fresh: ['rank:1', 5], flags: { perfect: 3, evil: 1 }, log: { 5: 10, a: 1 } });
  assert.equal(g.xp, 0);
  assert.equal(g.rank, RANKS.length - 1);
  assert.deepEqual(g.stickers, { first: 5 });
  assert.deepEqual(g.fresh, ['rank:1']);
  assert.deepEqual(g.flags, { perfect: 3 });
  assert.deepEqual(g.log, { 5: 10 });
  const s = sanitize({ game: { xp: 12 } });
  assert.equal(s.game.xp, 12);
  assert.equal(stickerCount(s), 0);
});
