// Builds a single exercise from a vocabulary item. Pure functions; every random
// choice goes through `rng` so tests can be deterministic.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const BLANK = '＿＿＿＿';

function sharesChar(a, b) {
  for (const ch of new Set(a)) if (b.includes(ch)) return true;
  return false;
}

/**
 * Choose plausible wrong answers. Closer look-alikes make better distractors,
 * which is what the exam's cloze and near-synonym questions really test:
 * same list, shared character, same length, same tier.
 */
export function pickDistractors(item, vocab, n, rng, { avoidIn = '', byDefinition = false } = {}) {
  const seen = new Set([item.w]);
  const seenCn = new Set([item.cn]);
  const scored = [];
  for (const c of vocab) {
    if (c.t !== item.t || seen.has(c.w)) continue;
    if (byDefinition && seenCn.has(c.cn)) continue;
    if (c.w.includes(item.w) || item.w.includes(c.w)) continue; // 成就 vs 成就感
    if (avoidIn && avoidIn.includes(c.w)) continue; // would already be visible in the sentence
    let score = rng() * 2; // tie-break noise
    if (c.s === item.s) score += 2;
    if (sharesChar(c.w, item.w)) score += 3;
    if (c.w.length === item.w.length) score += 1.5;
    if (c.tier === item.tier) score += 1;
    scored.push([score, c]);
  }
  scored.sort((x, y) => y[0] - x[0]);
  const out = [];
  for (const [, c] of scored) {
    if (out.some((o) => o.w === c.w || (byDefinition && o.cn === c.cn))) continue;
    out.push(c);
    if (out.length === n) break;
  }
  return out;
}

export function canCloze(item) {
  return !!item.ex && item.ex.includes(item.w);
}

/** Which kind of exercise a card of this box gets. Higher box → more production. */
export function kindForCard(card, item, { audioOk = false, rng = Math.random } = {}) {
  const b = card ? card.b : 0;
  const cloze = canCloze(item) ? 'cloze' : 'mcWord';
  const listen = audioOk ? 'dictation' : 'type';
  const pools = [
    ['mcDef'],
    ['mcWord', cloze],
    [cloze, 'mcWord'],
    [cloze, 'type'],
    ['type', listen, cloze],
    ['type', cloze, listen],
  ];
  const pool = pools[Math.min(b, 5)];
  return pool[Math.floor(rng() * pool.length)];
}

export function buildExercise({ item, kind, vocab, rng = Math.random }) {
  const base = { kind, itemId: item.id, key: item.w, item };
  switch (kind) {
    case 'mcDef': {
      const d = pickDistractors(item, vocab, 3, rng, { byDefinition: true });
      return {
        ...base,
        options: shuffle([item, ...d], rng).map((o) => ({ label: o.cn, correct: o.w === item.w })),
      };
    }
    case 'mcWord': {
      const d = pickDistractors(item, vocab, 3, rng);
      return {
        ...base,
        options: shuffle([item, ...d], rng).map((o) => ({ label: o.w, correct: o.w === item.w })),
      };
    }
    case 'cloze': {
      const sentence = item.ex.split(item.w).join(BLANK);
      const d = pickDistractors(item, vocab, 3, rng, { avoidIn: item.ex });
      return {
        ...base,
        sentence,
        options: shuffle([item, ...d], rng).map((o) => ({ label: o.w, correct: o.w === item.w })),
      };
    }
    case 'type':
    case 'dictation':
      return { ...base, hintChar: item.w[0], length: [...item.w].length };
    default:
      return base;
  }
}

const STRIP = /[\s，。、！？；：“”‘’「」『』（）()《》〈〉…·,.!?;:'"\-—~]/g;

export function normalise(s) {
  return String(s || '').normalize('NFKC').replace(STRIP, '');
}

/** 'correct' | 'pinyin' (typed letters instead of characters) | 'wrong' */
export function checkTyped(input, item) {
  const got = normalise(input);
  if (!got) return 'wrong';
  if (/^[a-zA-Züv\d]+$/.test(got)) return 'pinyin';
  return got === normalise(item.w) ? 'correct' : 'wrong';
}
