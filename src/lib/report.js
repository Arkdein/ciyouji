import { coverage, accuracy } from './stats.js';
import { daysThisWeek, effectiveStreak } from './streak.js';
import { isoFromDay, dayFromIso } from './dates.js';
import { writingSummary } from './writing.js';

/** Everything the teacher sees, in one small object. */
export function summarise(state, vocab, strands, today) {
  const { overall, byStrand } = coverage(vocab, state.cards);
  const acc = accuracy(state.log, today, 7);
  const weak = Object.entries(state.cards)
    .filter(([, c]) => c.b < 5 && (c.bad > 0 || c.lapses > 0))
    .sort((a, b) => b[1].lapses * 3 + b[1].bad - (a[1].lapses * 3 + a[1].bad))
    .slice(0, 10)
    .map(([w]) => w);
  const examDays = state.exam.date ? dayFromIso(state.exam.date) - today : null;
  return {
    date: isoFromDay(today),
    cls: state.profile.cls,
    idx: state.profile.idx,
    streak: effectiveStreak(state.streak, today),
    daysWeek: daysThisWeek(state.days, today),
    daysTotal: state.days.length,
    acc7: acc.pct,
    answered7: acc.answered,
    secure: overall.secure,
    reviewing: overall.reviewing,
    learning: overall.learning,
    unseen: overall.new,
    total: overall.total,
    examDays,
    lists: strands.map((s) => ({ id: s.id, num: s.num, cn: s.cn, ...(byStrand[s.id] || { new: 0, learning: 0, reviewing: 0, secure: 0, total: 0 }) })),
    weak,
    write: writingSummary(state, today),
  };
}

function checksum(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Compact text the student can paste into any form or message. Not secure, just tidy. */
export function progressCode(s) {
  const body = [
    s.date, s.cls, s.idx, s.streak, s.daysWeek, s.daysTotal, s.acc7 ?? '', s.secure, s.reviewing, s.learning, s.unseen,
    s.lists.map((l) => `${l.secure}/${l.total}`).join(','),
    s.weak.join(''),
    `W${s.write.started}/${s.write.secure}/${s.write.acc7 ?? ''}`,
  ].join('|');
  return `H1VS1|${body}|${checksum(body)}`;
}

/** Plain-language list summary, e.g. "1:12/65, 2:8/65, … 成:3/50". */
export function listsText(s) {
  return s.lists.map((l) => `${l.id === 'idiom' ? '成语' : l.num}:${l.secure}/${l.total}`).join(', ');
}

/** Turn a summary into the fields of a Google Form response, using config.entries. */
export function formFields(s, entries) {
  const values = {
    cls: s.cls,
    idx: s.idx,
    date: s.date,
    streak: s.streak,
    daysWeek: s.daysWeek,
    daysTotal: s.daysTotal,
    acc7: s.acc7 ?? '',
    secure: s.secure,
    reviewing: s.reviewing,
    learning: s.learning,
    unseen: s.unseen,
    lists: listsText(s),
    weak: s.weak.join('、'),
    writeStarted: s.write.started,
    writeSecure: s.write.secure,
    writeAcc7: s.write.acc7 ?? '',
    writeWeak: s.write.weak.join('、'),
    code: progressCode(s),
  };
  const out = {};
  for (const [name, entryId] of Object.entries(entries || {})) {
    if (entryId && name in values) out[entryId] = String(values[name]);
  }
  return out;
}

/**
 * POST to a Google Form. Browsers hide the response of cross-site form posts
 * (mode: 'no-cors'), so success means "sent", not "confirmed"; the report
 * screen therefore also offers the copyable progress code.
 */
export async function submitToForm(s, config) {
  if (!config || !config.formResponseUrl) throw new Error('not-configured');
  const body = new URLSearchParams(formFields(s, config.entries));
  await fetch(config.formResponseUrl, { method: 'POST', mode: 'no-cors', body });
}
