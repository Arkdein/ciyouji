import { newCard, applyReview } from './srs.js';
import { newStreak, recordStudyDay } from './streak.js';
import { WRITE_STUDY_DAY_ANSWERS } from './writing.js';
import { XP, newGame, sanitizeGame, addXp, setFlag } from './game.js';

export const STUDY_DAY_ANSWERS = 8; // a day counts once this many answers are in, or a session is finished
const KEEP_LOG_DAYS = 120;

export function defaultState() {
  return {
    v: 2,
    profile: { name: '', cls: '', idx: '' },
    settings: { newPerDay: 5, quiet: false, theme: 'system', focus: null, showEn: true },
    exam: { date: null },
    cards: {}, // keyed by headword
    days: [], // study-day numbers
    log: {}, // { dayNumber: [answered, correct] }
    streak: newStreak(),
    intro: { day: 0, n: 0 }, // new words introduced today
    sent: null, // ISO timestamp of last submission to the teacher
    writing: { cards: {}, log: {}, intro: { day: 0, n: 0 } }, // handwriting track, keyed by character
    game: newGame(), // XP, rank, stickers
  };
}

/** Accept only well-formed data (from storage or a restored backup). */
export function sanitize(raw) {
  const d = defaultState();
  if (!raw || typeof raw !== 'object') return d;
  const str = (v, max = 40) => (typeof v === 'string' ? v.slice(0, max) : '');
  const num = (v, fb = 0) => (Number.isFinite(v) ? v : fb);
  if (raw.profile) d.profile = { name: str(raw.profile.name, 40).replace(/[|\n\r]/g, ' '), cls: str(raw.profile.cls, 20), idx: str(raw.profile.idx, 20) };
  if (raw.settings) {
    const s = raw.settings;
    d.settings = {
      newPerDay: [3, 5, 8, 12].includes(s.newPerDay) ? s.newPerDay : 5,
      quiet: !!s.quiet,
      theme: ['system', 'light', 'dark'].includes(s.theme) ? s.theme : 'system',
      focus: typeof s.focus === 'string' ? s.focus.slice(0, 10) : null,
      showEn: s.showEn !== false,
    };
  }
  if (raw.exam && /^\d{4}-\d{2}-\d{2}$/.test(raw.exam.date || '')) d.exam = { date: raw.exam.date };
  if (raw.cards && typeof raw.cards === 'object') {
    for (const [k, c] of Object.entries(raw.cards)) {
      if (!c || typeof c !== 'object' || k.length > 40) continue;
      d.cards[k] = {
        b: Math.min(5, Math.max(0, num(c.b))),
        due: num(c.due),
        seen: num(c.seen),
        ok: num(c.ok),
        bad: num(c.bad),
        lapses: num(c.lapses),
        hint: num(c.hint),
        last: num(c.last),
      };
    }
  }
  if (Array.isArray(raw.days)) d.days = [...new Set(raw.days.filter(Number.isFinite))].sort((a, b) => a - b).slice(-500);
  if (raw.log && typeof raw.log === 'object') {
    for (const [k, v] of Object.entries(raw.log)) {
      if (Array.isArray(v) && Number.isFinite(+k)) d.log[k] = [num(v[0]), num(v[1])];
    }
  }
  if (raw.streak) d.streak = { count: num(raw.streak.count), last: Number.isFinite(raw.streak.last) ? raw.streak.last : null, freezes: Math.min(2, Math.max(0, num(raw.streak.freezes, 1))) };
  if (raw.writing && typeof raw.writing === 'object') {
    const w = raw.writing;
    if (w.cards && typeof w.cards === 'object') {
      for (const [k, c] of Object.entries(w.cards)) {
        if (!c || typeof c !== 'object' || [...k].length !== 1) continue;
        d.writing.cards[k] = { b: Math.min(5, Math.max(0, num(c.b))), due: num(c.due), seen: num(c.seen), ok: num(c.ok), bad: num(c.bad), lapses: num(c.lapses), hint: num(c.hint), last: num(c.last) };
      }
    }
    if (w.log && typeof w.log === 'object') {
      for (const [k, v] of Object.entries(w.log)) if (Array.isArray(v) && Number.isFinite(+k)) d.writing.log[k] = [num(v[0]), num(v[1])];
    }
    if (w.intro) d.writing.intro = { day: num(w.intro.day), n: num(w.intro.n) };
  }
  if (raw.intro) d.intro = { day: num(raw.intro.day), n: num(raw.intro.n) };
  d.game = sanitizeGame(raw.game);
  if (typeof raw.sent === 'string') d.sent = raw.sent.slice(0, 40);
  return d;
}

export function answeredToday(state, today) {
  return (state.log[today] && state.log[today][0]) || 0;
}

export function introducedToday(state, today) {
  return state.intro.day === today ? state.intro.n : 0;
}

/** Create the card the first time a headword is shown, and count it against today's quota. */
export function introduceCard(state, key, today) {
  if (state.cards[key]) return state;
  const base = state.intro.day === today ? state.intro.n : 0;
  return addXp({ ...state, cards: { ...state.cards, [key]: newCard(today) }, intro: { day: today, n: base + 1 } }, XP.meet, today);
}

export function markStudied(state, today) {
  if (state.days.includes(today)) return state;
  const last = state.days.length ? Math.max(...state.days) : null;
  let next = { ...state, days: [...state.days, today].slice(-500), streak: recordStudyDay(state.streak, today) };
  if (last != null && today - last >= 5) next = setFlag(next, 'comeback', today); // away for 4+ days
  return addXp(next, XP.studyDay, today);
}

/** A vocab session reached its end: bonus XP, and the "perfect run" flag for 10+ clean answers. */
export function finishSession(state, { answered, correct }, today) {
  if (!answered) return state;
  let next = addXp(state, XP.session, today);
  if (answered >= 10 && correct === answered) next = setFlag(next, 'perfect', today);
  return next;
}

/** A handwriting session reached its end. */
export function finishWriteSession(state, { answered, intros }, today) {
  return answered + intros > 0 ? addXp(state, XP.session, today) : state;
}

/** Record one graded answer; marks the day as studied once enough answers are in. */
export function answerCard(state, key, outcome, today) {
  const card = state.cards[key] || newCard(today);
  const entry = state.log[today] || [0, 0];
  const log = { ...state.log, [today]: [entry[0] + 1, entry[1] + (outcome === 'again' ? 0 : 1)] };
  for (const k of Object.keys(log)) if (+k < today - KEEP_LOG_DAYS) delete log[k];
  let next = addXp({ ...state, cards: { ...state.cards, [key]: applyReview(card, outcome, today) }, log }, outcome === 'good' ? XP.good : outcome === 'hint' ? XP.hint : XP.again, today);
  if (log[today][0] >= STUDY_DAY_ANSWERS) next = markStudied(next, today);
  return next;
}

// ---- Handwriting track -------------------------------------------------------------

export function writtenIntroducedToday(state, today) {
  return state.writing.intro.day === today ? state.writing.intro.n : 0;
}

/** First time a character is watched and traced: create its card (due tomorrow). */
export function writeIntroduce(state, ch, today) {
  if (state.writing.cards[ch]) return state;
  const w = state.writing;
  const base = w.intro.day === today ? w.intro.n : 0;
  const card = { ...newCard(today), due: today + 1, seen: 1 };
  return addXp({ ...state, writing: { ...w, cards: { ...w.cards, [ch]: card }, intro: { day: today, n: base + 1 } } }, XP.traced, today);
}

/** Record one from-memory attempt. */
export function writeAnswer(state, ch, outcome, today) {
  const w = state.writing;
  const card = w.cards[ch] || newCard(today);
  const e = w.log[today] || [0, 0];
  const log = { ...w.log, [today]: [e[0] + 1, e[1] + (outcome === 'again' ? 0 : 1)] };
  for (const k of Object.keys(log)) if (+k < today - KEEP_LOG_DAYS) delete log[k];
  let next = addXp({ ...state, writing: { ...w, cards: { ...w.cards, [ch]: applyReview(card, outcome, today) }, log } }, outcome === 'good' ? XP.wGood : outcome === 'hint' ? XP.wHint : XP.wAgain, today);
  if (log[today][0] >= WRITE_STUDY_DAY_ANSWERS) next = markStudied(next, today);
  return next;
}
