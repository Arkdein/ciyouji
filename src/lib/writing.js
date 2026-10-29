// Handwriting practice: pure helpers (no DOM), so they can be unit-tested.
// Each Chinese character gets its own spaced-repetition card (separate from the word cards).
import { isDue, statusOf } from './srs.js';

export const WRITE_SESSION_SIZE = 8; // characters per session
export const WRITE_NEW_PER_SESSION = 4; // brand-new characters per session
export const WRITE_STUDY_DAY_ANSWERS = 4; // a writing day counts sooner: writing is slow

const HAN = /\p{Script=Han}/u;

export const charsOf = (word) => [...word].filter((c) => HAN.test(c));

/** Pinyin syllable for the n-th character of a word, or null when the counts do not line up. */
export function syllableFor(item, index) {
  const syl = (item.py || '').trim().split(/\s+/).filter(Boolean);
  return syl.length === charsOf(item.w).length ? syl[index] : null;
}

/**
 * Characters a student may be asked to write: those inside words they have already met
 * (a card exists for the headword). Map of char → the item to show as context.
 */
export function writingPool(vocab, cards) {
  const pool = new Map();
  for (const it of vocab) {
    if (!cards[it.w]) continue;
    for (const ch of charsOf(it.w)) {
      if (!pool.has(ch)) pool.set(ch, it);
    }
  }
  return pool;
}

/**
 * Today's writing queue: due characters first (oldest first), then new ones from the words
 * met most recently. Entries: { char, itemId, intro } – intro=true means "watch and trace" first.
 */
export function buildWriteQueue({ vocab, cards, wcards, today, newLimit = WRITE_NEW_PER_SESSION, introducedToday = 0, dailyNewCap = 12, size = WRITE_SESSION_SIZE }) {
  const pool = writingPool(vocab, cards);
  const due = [...pool.keys()]
    .filter((ch) => wcards[ch] && isDue(wcards[ch], today))
    .sort((a, b) => wcards[a].due - wcards[b].due || wcards[a].b - wcards[b].b)
    .slice(0, size);
  const room = Math.max(0, Math.min(newLimit, size - due.length, dailyNewCap - introducedToday));
  const fresh = [...pool.keys()]
    .filter((ch) => !wcards[ch])
    .map((ch, i) => ({ ch, i, last: cards[pool.get(ch).w].last || 0 }))
    .sort((a, b) => b.last - a.last || a.i - b.i)
    .slice(0, room);
  return [
    ...due.map((ch) => ({ char: ch, itemId: pool.get(ch).id, intro: false })),
    ...fresh.map(({ ch }) => ({ char: ch, itemId: pool.get(ch).id, intro: true })),
  ];
}

/** Queue for one word (from the word bank): learn characters never written, quiz the rest. */
export function buildWordQueue(item, wcards) {
  return charsOf(item.w).map((ch) => ({ char: ch, itemId: item.id, intro: !wcards[ch] }));
}

/** From-memory result → SRS outcome. Hints count as mistakes. */
export function outcomeForMistakes(m) {
  if (m <= 0) return 'good';
  if (m <= 2) return 'hint';
  return 'again';
}

/** Compact numbers for the teacher report. */
export function writingSummary(state, today) {
  const w = state.writing || { cards: {}, log: {} };
  const keys = Object.keys(w.cards);
  const secure = keys.filter((k) => statusOf(w.cards[k]) === 'secure').length;
  let attempts = 0;
  let clean = 0;
  for (let d = today - 6; d <= today; d++) {
    const e = w.log[d];
    if (e) { attempts += e[0]; clean += e[1]; }
  }
  const weak = keys
    .filter((k) => w.cards[k].b < 5 && (w.cards[k].bad > 0 || w.cards[k].lapses > 0))
    .sort((a, b) => w.cards[b].lapses * 3 + w.cards[b].bad - (w.cards[a].lapses * 3 + w.cards[a].bad))
    .slice(0, 8);
  return {
    started: keys.length,
    secure,
    attempts7: attempts,
    acc7: attempts ? Math.round((100 * clean) / attempts) : null,
    weak,
  };
}
