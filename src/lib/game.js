// Points (XP), travel ranks and sticker awards. Pure functions over the saved state.
import { buildContext, metStickers } from './stickers.js';

export const XP = {
  meet: 5, // first meeting with a new word
  good: 10,
  hint: 6,
  again: 2, // trying still counts
  session: 20, // finishing a session
  studyDay: 15, // first study day of the day
  traced: 12,
  wGood: 15,
  wHint: 9,
  wAgain: 3,
  sticker: 25,
};
export const DAILY_GOAL = 120;
const KEEP_DAYS = 120;

export const RANKS = [
  { cn: '行者', en: 'Wayfarer', ch: '行', xp: 0 },
  { cn: '旅人', en: 'Traveller', ch: '旅', xp: 300 },
  { cn: '探路人', en: 'Pathfinder', ch: '探', xp: 900 },
  { cn: '游历家', en: 'Explorer', ch: '游', xp: 2000 },
  { cn: '万里行', en: 'Ten-thousand-li walker', ch: '万', xp: 4000 },
  { cn: '云游四海', en: 'Roamer of the four seas', ch: '云', xp: 7000 },
  { cn: '游记大家', en: 'Travelogue master', ch: '记', xp: 12000 },
];

export function newGame() {
  return { xp: 0, log: {}, stickers: {}, fresh: [], rank: 0, flags: {} };
}

export function sanitizeGame(raw) {
  const g = newGame();
  if (!raw || typeof raw !== 'object') return g;
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  g.xp = Math.floor(num(raw.xp));
  if (raw.log && typeof raw.log === 'object') for (const [k, v] of Object.entries(raw.log)) if (Number.isFinite(+k) && Number.isFinite(v)) g.log[k] = Math.max(0, v);
  if (raw.stickers && typeof raw.stickers === 'object') for (const [k, v] of Object.entries(raw.stickers)) if (typeof k === 'string' && k.length < 20 && Number.isFinite(v)) g.stickers[k] = v;
  if (Array.isArray(raw.fresh)) g.fresh = raw.fresh.filter((x) => typeof x === 'string' && x.length < 30).slice(0, 40);
  g.rank = Math.min(RANKS.length - 1, Math.floor(num(raw.rank)));
  if (raw.flags && typeof raw.flags === 'object') for (const k of ['perfect', 'comeback']) if (Number.isFinite(raw.flags[k])) g.flags[k] = raw.flags[k];
  return g;
}

export function rankIndex(xp) {
  let i = 0;
  for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) i = k;
  return i;
}

/** Where the student stands: current rank, next rank, progress through the current band. */
export function rankInfo(xp) {
  const i = rankIndex(xp);
  const cur = RANKS[i];
  const next = RANKS[i + 1] || null;
  const into = xp - cur.xp;
  const span = next ? next.xp - cur.xp : 0;
  return { index: i, rank: cur, next, into, span, left: next ? next.xp - xp : 0, pct: next ? Math.min(100, Math.round((100 * into) / span)) : 100 };
}

/** Add XP (today's log too). Queues a rank-up celebration if a new rank is reached. */
export function addXp(state, amount, today) {
  if (!amount) return state;
  const g = state.game || newGame();
  const xp = g.xp + amount;
  const log = { ...g.log, [today]: (g.log[today] || 0) + amount };
  for (const k of Object.keys(log)) if (+k < today - KEEP_DAYS) delete log[k];
  let { rank, fresh } = g;
  const now = rankIndex(xp);
  if (now > rank) {
    fresh = [...fresh, ...Array.from({ length: now - rank }, (_, j) => `rank:${rank + 1 + j}`)];
    rank = now;
  }
  return { ...state, game: { ...g, xp, log, rank, fresh } };
}

export const xpToday = (state, today) => (state.game && state.game.log[today]) || 0;

/** Set a one-off event flag (perfect session, comeback). */
export function setFlag(state, name, today) {
  const g = state.game || newGame();
  if (g.flags[name]) return state;
  return { ...state, game: { ...g, flags: { ...g.flags, [name]: today } } };
}

/**
 * Grant every sticker whose rule is now met and that is not yet owned. Each new sticker queues a
 * celebration and pays a little XP. Returns the same object when nothing changed.
 */
export function awardStickers(state, vocab, today) {
  const g = state.game || newGame();
  const earned = metStickers(buildContext(state, vocab, today)).filter((id) => !(id in g.stickers));
  if (!earned.length) return state;
  let next = {
    ...state,
    game: { ...g, stickers: { ...g.stickers, ...Object.fromEntries(earned.map((id) => [id, today])) }, fresh: [...g.fresh, ...earned.map((id) => `sticker:${id}`)] },
  };
  next = addXp(next, XP.sticker * earned.length, today);
  return next;
}

/** The front of the celebration queue, or null. */
export const nextCelebration = (state) => (state.game && state.game.fresh[0]) || null;

export function dismissCelebration(state) {
  const g = state.game;
  if (!g || !g.fresh.length) return state;
  return { ...state, game: { ...g, fresh: g.fresh.slice(1) } };
}

export const stickerCount = (state) => Object.keys((state.game && state.game.stickers) || {}).length;
