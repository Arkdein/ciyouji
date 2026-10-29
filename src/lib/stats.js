import { statusOf } from './srs.js';

const EMPTY = () => ({ new: 0, learning: 0, reviewing: 0, secure: 0, total: 0 });

/** Counts by mastery status, overall (unique headwords) and per list. */
export function coverage(vocab, cards) {
  const overall = EMPTY();
  const byStrand = {};
  const seen = new Set();
  for (const it of vocab) {
    const st = statusOf(cards[it.w]);
    byStrand[it.s] ||= EMPTY();
    byStrand[it.s][st]++;
    byStrand[it.s].total++;
    if (!seen.has(it.w)) {
      seen.add(it.w);
      overall[st]++;
      overall.total++;
    }
  }
  return { overall, byStrand };
}

/** log: { [dayNumber]: [answered, correct] } */
export function accuracy(log, today, days = 7) {
  let a = 0;
  let c = 0;
  for (let d = today - days + 1; d <= today; d++) {
    const e = log[d];
    if (e) {
      a += e[0];
      c += e[1];
    }
  }
  return { answered: a, correct: c, pct: a ? Math.round((100 * c) / a) : null };
}

/**
 * Pace check against the exam date. The last REVISION_DAYS are kept for pure
 * revision, so new words must all be started before then.
 */
export function paceInfo({ untouched, newPerDay, examDays, revisionDays = 14 }) {
  if (examDays == null) return { state: 'noDate' };
  if (untouched === 0) return { state: 'allStarted', examDays };
  if (examDays <= revisionDays) return { state: 'revision', examDays, untouched };
  const window = examDays - revisionDays;
  const needed = Math.ceil(untouched / window);
  const finishDays = Math.ceil(untouched / Math.max(1, newPerDay));
  return {
    state: finishDays <= window ? 'onTrack' : 'behind',
    examDays,
    untouched,
    needed,
    finishDays,
  };
}
