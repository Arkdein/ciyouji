// Sticker definitions and the rules for earning them. Pure functions, no DOM: unit-tested.
// A sticker is permanent once earned. Each rule reads a small "ctx" built once per check.
import { coverage } from './stats.js';
import { statusOf } from './srs.js';
import { dayFromIso } from './dates.js';
import { effectiveStreak } from './streak.js';

export const STAMP_AT = 0.8; // a stop is stamped (and its sticker earned) at 80% of its words secure

export const GROUPS = [
  { id: 'stop', cn: '各站纪念', en: 'Souvenirs from each stop' },
  { id: 'habit', cn: '好习惯', en: 'Habits' },
  { id: 'words', cn: '词汇里程碑', en: 'Word milestones' },
  { id: 'writing', cn: '书写', en: 'Handwriting' },
];

const stop = (id, cn, en, strandCn) => ({
  id,
  group: 'stop',
  cn,
  en,
  how: { cn: `「${strandCn}」掌握 80% 的词语`, en: "Get 80% of this stop's words secure" },
  stop: id,
});

export const STICKERS = [
  stop('s1', '节节高升', 'Bamboo, joint by joint', '个人成长与心理素质'),
  stop('s2', '茶香情浓', 'Tea for two', '人际关系与家庭'),
  stop('s3', '邻里灯火', 'Neighbourhood lights', '社区生活与邻里精神'),
  stop('s4', '机灵小伙伴', 'Robot buddy', '科技与数码生活'),
  stop('s5', '绿意盎然', 'Green shoots', '环境与永续发展'),
  stop('s6', '灯火相传', 'Passing on the light', '传统文化与现代化'),
  stop('s7', '公正之秤', 'The fair scales', '公民意识与社会政策'),
  stop('s8', '职场行囊', 'Work satchel', '职场、经济与劳动力'),
  stop('s9', '书山学海', 'Books and learning', '教育、青少年与乐龄课题'),
  stop('idiom', '成语宝卷', 'Idiom scroll', '成语库'),

  { id: 'first', group: 'habit', cn: '初次出发', en: 'First steps', how: { cn: '完成第一天的学习', en: 'Finish your first study day' } },
  { id: 'streak3', group: 'habit', cn: '三日星火', en: 'A spark', how: { cn: '连续学习 3 天', en: 'Study 3 days in a row' } },
  { id: 'streak7', group: 'habit', cn: '七日不熄', en: 'Steady flame', how: { cn: '连续学习 7 天', en: 'Study 7 days in a row' } },
  { id: 'streak30', group: 'habit', cn: '三十日篝火', en: 'Bonfire', how: { cn: '连续学习 30 天', en: 'Study 30 days in a row' } },
  { id: 'perfect', group: 'habit', cn: '满分旅程', en: 'Perfect run', how: { cn: '一程里至少 10 题全部答对', en: 'Answer at least 10 questions in one session, all correct' } },
  { id: 'comeback', group: 'habit', cn: '归帆', en: 'Back on course', how: { cn: '停了 4 天以上，又回来学习', en: 'Return to studying after 4 or more days away' } },
  { id: 'exam100', group: 'habit', cn: '倒数百日', en: '100 days to go', how: { cn: '距离考试 100 天内，仍然坚持学习', en: 'Study on a day when the exam is 100 days away or less' } },
  { id: 'exam30', group: 'habit', cn: '冲刺三十天', en: '30-day sprint', how: { cn: '距离考试 30 天内，仍然坚持学习', en: 'Study on a day when the exam is 30 days away or less' } },

  { id: 'words50', group: 'words', cn: '初窥门径', en: 'The first key', how: { cn: '累计 50 个词语已掌握', en: '50 words secure' } },
  { id: 'words150', group: 'words', cn: '渐入佳境', en: 'Through the gate', how: { cn: '累计 150 个词语已掌握', en: '150 words secure' } },
  { id: 'words400', group: 'words', cn: '满载而归', en: 'Treasure chest', how: { cn: '累计 400 个词语已掌握', en: '400 words secure' } },
  { id: 'journey', group: 'words', cn: '全程通关', en: 'Journey complete', how: { cn: '十个站点全部盖章', en: 'Stamp all ten stops' } },

  { id: 'write1', group: 'writing', cn: '初试笔锋', en: 'First strokes', how: { cn: '描完第一个字', en: 'Trace your first character' } },
  { id: 'write20', group: 'writing', cn: '研墨二十', en: 'Ink and stone', how: { cn: '开始练写 20 个字', en: 'Start 20 characters' } },
  { id: 'write50', group: 'writing', cn: '默写五十', en: 'Fifty from memory', how: { cn: '累计默写正确 50 次', en: 'Write 50 characters correctly from memory' } },
  { id: 'writeday', group: 'writing', cn: '一笔不苟', en: 'Steady hand', how: { cn: '一天默写至少 10 次，全部写对', en: 'Write from memory at least 10 times in a day, all clean' } },
  { id: 'writejade', group: 'writing', cn: '字字珠玑', en: 'Jade characters', how: { cn: '25 个字的书写已掌握', en: '25 characters secure in writing' } },
];

export const STICKER_BY_ID = Object.fromEntries(STICKERS.map((s) => [s.id, s]));

/** Everything the rules need, computed once. */
export function buildContext(state, vocab, today) {
  const { overall, byStrand } = coverage(vocab, state.cards);
  const stamped = new Set(Object.entries(byStrand).filter(([, c]) => c.total > 0 && c.secure / c.total >= STAMP_AT).map(([id]) => id));
  const wc = state.writing?.cards || {};
  const wlog = state.writing?.log || {};
  const examDays = state.exam?.date ? dayFromIso(state.exam.date) - today : null;
  const studiedToday = state.days.includes(today);
  return {
    stamped,
    stopCount: Object.keys(byStrand).length,
    secure: overall.secure,
    streak: Math.max(state.streak.count || 0, effectiveStreak(state.streak, today)),
    days: state.days.length,
    flags: state.game?.flags || {},
    examDays: studiedToday ? examDays : null,
    wStarted: Object.keys(wc).length,
    wOk: Object.values(wc).reduce((n, c) => n + (c.ok || 0), 0),
    wSecure: Object.values(wc).filter((c) => statusOf(c) === 'secure').length,
    wCleanDay: Object.values(wlog).some((e) => e[0] >= 10 && e[1] === e[0]),
  };
}

const RULES = {
  first: (c) => c.days >= 1,
  streak3: (c) => c.streak >= 3,
  streak7: (c) => c.streak >= 7,
  streak30: (c) => c.streak >= 30,
  perfect: (c) => !!c.flags.perfect,
  comeback: (c) => !!c.flags.comeback,
  exam100: (c) => c.examDays != null && c.examDays >= 0 && c.examDays <= 100,
  exam30: (c) => c.examDays != null && c.examDays >= 0 && c.examDays <= 30,
  words50: (c) => c.secure >= 50,
  words150: (c) => c.secure >= 150,
  words400: (c) => c.secure >= 400,
  journey: (c) => c.stopCount > 0 && c.stamped.size >= c.stopCount,
  write1: (c) => c.wStarted >= 1,
  write20: (c) => c.wStarted >= 20,
  write50: (c) => c.wOk >= 50,
  writeday: (c) => c.wCleanDay,
  writejade: (c) => c.wSecure >= 25,
};

/** Ids of stickers whose rule is met right now (earned or not). */
export function metStickers(ctx) {
  const out = [];
  for (const s of STICKERS) {
    const ok = s.stop ? ctx.stamped.has(s.stop) : RULES[s.id] && RULES[s.id](ctx);
    if (ok) out.push(s.id);
  }
  return out;
}
