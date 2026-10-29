import { shuffle } from './exercises.js';

export const SESSION_SIZE = 12;
export const REVISION_DAYS = 14; // inside this window before the exam: no new words, weakest first

/** Index of the first item for every headword (overlapping lists share one card). */
export function canonicalMap(vocab) {
  const m = new Map();
  for (const it of vocab) if (!m.has(it.w)) m.set(it.w, it);
  return m;
}

/**
 * The order new headwords are introduced in: item k of every list before item
 * k+1 of any list (the lists are already priority-ordered), with an idiom
 * slipped in after every four words so both kinds grow together.
 */
export function introOrder(vocab) {
  const lists = new Map();
  for (const it of vocab) {
    if (!lists.has(it.s)) lists.set(it.s, []);
    lists.get(it.s).push(it);
  }
  const words = [];
  const idioms = lists.get('idiom') || [];
  const strandLists = [...lists.entries()].filter(([s]) => s !== 'idiom').map(([, l]) => l);
  const longest = Math.max(0, ...strandLists.map((l) => l.length));
  for (let k = 0; k < longest; k++) for (const l of strandLists) if (l[k]) words.push(l[k]);
  const out = [];
  let i = 0;
  for (const w of words) {
    out.push(w);
    if (out.length % 5 === 4 && i < idioms.length) out.push(idioms[i++]);
  }
  while (i < idioms.length) out.push(idioms[i++]);
  const seen = new Set();
  return out.filter((it) => (seen.has(it.w) ? false : seen.add(it.w)));
}

function weakness(c) {
  return c.lapses * 3 + c.bad - c.ok * 0.25 - c.b;
}

/**
 * Decide what today's session contains.
 * mode 'daily'  – due reviews, then today's quota of new words
 * mode 'strand' – practise one list (due first, then lowest box, a few new)
 * mode 'weak'   – the words you get wrong most
 * Returns [{ key, itemId, intro }] in the order they should be presented.
 */
export function buildQueue({
  vocab,
  cards,
  today,
  mode = 'daily',
  strand = null,
  newLimit = 5,
  introducedToday = 0,
  examDays = null,
  focus = null,
  rng = Math.random,
  size = SESSION_SIZE,
}) {
  const canon = canonicalMap(vocab);
  const order = introOrder(vocab);
  const itemIdFor = (key, st) => {
    if (st) {
      const hit = vocab.find((v) => v.s === st && v.w === key);
      if (hit) return hit.id;
    }
    return canon.get(key).id;
  };
  const entry = (key, intro = false, st = null) => ({ key, itemId: itemIdFor(key, st), intro });
  const keys = Object.keys(cards).filter((k) => canon.has(k));

  if (mode === 'weak') {
    return keys
      .filter((k) => cards[k].b < 5 && (cards[k].bad > 0 || cards[k].lapses > 0))
      .sort((a, b) => weakness(cards[b]) - weakness(cards[a]))
      .slice(0, size)
      .map((k) => entry(k));
  }

  if (mode === 'strand') {
    const inStrand = [...new Set(vocab.filter((v) => v.s === strand).map((v) => v.w))];
    const started = inStrand.filter((k) => cards[k]);
    const due = started.filter((k) => cards[k].due <= today).sort((a, b) => cards[a].due - cards[b].due);
    const rest = started.filter((k) => cards[k].due > today).sort((a, b) => cards[a].b - cards[b].b);
    const fresh = inStrand.filter((k) => !cards[k]).slice(0, 3);
    const picked = [...due, ...rest].slice(0, Math.max(0, size - fresh.length)).map((k) => entry(k, false, strand));
    const intros = fresh.map((k) => entry(k, true, strand));
    return weave(shuffle(picked, rng), intros);
  }

  // daily
  const revision = examDays != null && examDays <= REVISION_DAYS;
  const dueKeys = keys
    .filter((k) => cards[k].due <= today)
    .sort((a, b) => cards[a].due - cards[b].due || cards[a].b - cards[b].b);
  const backlog = dueKeys.length > size;
  let reviews = dueKeys.slice(0, size);
  if (revision && reviews.length < size) {
    const extra = keys
      .filter((k) => cards[k].due > today && cards[k].b < 5)
      .sort((a, b) => weakness(cards[b]) - weakness(cards[a]))
      .slice(0, size - reviews.length);
    reviews = reviews.concat(extra);
  }
  let slots = revision || backlog ? 0 : Math.max(0, newLimit - introducedToday);
  const fresh = [];
  if (slots > 0) {
    const candidates = order.filter((it) => !cards[it.w]);
    const first = focus ? candidates.filter((it) => it.s === focus) : [];
    const pool = [...first, ...candidates.filter((it) => !first.includes(it))];
    for (const it of pool) {
      if (fresh.length >= slots) break;
      fresh.push(it.w);
    }
  }
  return weave(shuffle(reviews.map((k) => entry(k)), rng), fresh.map((k) => entry(k, true)));
}

/** Put each intro card among the reviews, roughly every third position. */
function weave(reviews, intros) {
  const out = reviews.slice();
  intros.forEach((intro, j) => {
    out.splice(Math.min(out.length, 1 + j * 3), 0, intro);
  });
  return out;
}

/** Re-ask a missed card a few places later (once per session). */
export function requeueMissed(queue, index, entry) {
  const at = Math.min(queue.length, index + 4);
  const copy = queue.slice();
  copy.splice(at, 0, { ...entry, intro: false, retry: true });
  return copy;
}

/** After an intro card is acknowledged, schedule its first quiz a few cards later. */
export function scheduleCheck(queue, index, entry) {
  const at = Math.min(queue.length, index + 4);
  const copy = queue.slice();
  copy.splice(at, 0, { ...entry, intro: false, check: true });
  return copy;
}
