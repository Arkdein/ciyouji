import { weekStart } from './dates.js';

// A "study day" is a day with a finished session (or 8+ answers). The streak is
// forgiving by design: a missed day is bridged automatically by a banked rest
// day. You start with one, and earn another (max 2) for every 7 days of streak.
export const MAX_FREEZES = 2;
export const WEEKLY_GOAL = 4;

export function newStreak() {
  return { count: 0, last: null, freezes: 1 };
}

/** Record that today counted as a study day. Returns a new streak object. */
export function recordStudyDay(streak, today) {
  if (streak.last === today) return streak;
  const s = { ...streak };
  if (s.last == null) {
    s.count = 1;
  } else {
    const missed = today - s.last - 1;
    if (missed <= 0) {
      s.count += 1;
    } else if (missed <= s.freezes) {
      s.freezes -= missed;
      s.count += 1;
    } else {
      s.count = 1;
    }
  }
  s.last = today;
  if (s.count > 0 && s.count % 7 === 0 && s.freezes < MAX_FREEZES) s.freezes += 1;
  return s;
}

/** The streak the student should *see* today, without mutating anything. */
export function effectiveStreak(streak, today) {
  if (streak.last == null) return 0;
  const missed = today - streak.last - 1;
  if (missed <= 0) return streak.count;
  return missed <= streak.freezes ? streak.count : 0;
}

/** Seven booleans, Monday→Sunday, for the week containing `today`. */
export function weekDots(days, today) {
  const start = weekStart(today);
  const set = new Set(days);
  return Array.from({ length: 7 }, (_, i) => set.has(start + i));
}

export function daysThisWeek(days, today) {
  return weekDots(days, today).filter(Boolean).length;
}
