import { useMemo } from 'preact/hooks';
import { useStore } from '../lib/store.js';
import { useToday, go } from '../lib/hooks.js';
import { VOCAB, STRANDS, UNIQUE_TOTAL } from '../lib/vocab.js';
import { coverage, paceInfo } from '../lib/stats.js';
import { buildQueue, SESSION_SIZE, REVISION_DAYS } from '../lib/session.js';
import { introducedToday, writtenIntroducedToday } from '../lib/progress.js';
import { buildWriteQueue } from '../lib/writing.js';
import { weekDots, effectiveStreak, WEEKLY_GOAL, daysThisWeek } from '../lib/streak.js';
import { dayFromIso } from '../lib/dates.js';
import { Icon } from '../components/Icon.jsx';
import { MasteryBar, Legend } from '../components/Shared.jsx';

const STAMP_AT = 0.8; // a stop is stamped once 80% of its words are secure
const DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function paceText(p, newPerDay) {
  switch (p.state) {
    case 'noDate':
      return { tone: 'info', cn: '在「进度」里设定考试日期，这里会告诉你进度是否跟得上。', en: 'Set your exam date under Progress to see whether you are on pace.' };
    case 'allStarted':
      return { tone: 'ok', cn: '所有词语都已开始学习，接下来专心巩固。', en: 'Every word has been started. Now it is about keeping them secure.' };
    case 'revision':
      return { tone: 'info', cn: `进入最后复习期：不再加新词，优先复习最容易错的词。`, en: `Revision fortnight: no new words, weakest items first. ${p.untouched} words were never started.` };
    case 'onTrack':
      return { tone: 'ok', cn: `照目前每天 ${newPerDay} 个新词，可在最后复习期前学完，还有余裕。`, en: `At ${newPerDay} new words a day you will finish with ${p.examDays - REVISION_DAYS - p.finishDays} days to spare before the revision fortnight.` };
    default:
      return { tone: 'warn', cn: `还有 ${p.untouched} 个词未开始，距离考试 ${p.examDays} 天。建议每天至少 ${p.needed} 个新词。`, en: `${p.untouched} words not started, ${p.examDays} days left. Aim for at least ${p.needed} new words a day (change this under Progress).` };
  }
}

export function Home() {
  const st = useStore();
  const today = useToday();
  const cov = useMemo(() => coverage(VOCAB, st.cards), [st.cards]);
  const examDays = st.exam.date ? dayFromIso(st.exam.date) - today : null;

  const plan = useMemo(() => {
    const q = buildQueue({
      vocab: VOCAB, cards: st.cards, today, mode: 'daily', newLimit: st.settings.newPerDay,
      introducedToday: introducedToday(st, today), examDays, focus: st.settings.focus, rng: () => 0.5,
    });
    return { total: q.length, fresh: q.filter((e) => e.intro).length, reviews: q.filter((e) => !e.intro).length };
  }, [st.cards, st.intro, st.settings, examDays, today]);

  const writePlan = useMemo(
    () => buildWriteQueue({ vocab: VOCAB, cards: st.cards, wcards: st.writing.cards, today, introducedToday: writtenIntroducedToday(st, today) }).length,
    [st.cards, st.writing, today],
  );
  const dueAll = Object.values(st.cards).filter((c) => c.due <= today).length;
  const weakCount = Object.values(st.cards).filter((c) => c.b < 5 && (c.bad > 0 || c.lapses > 0)).length;
  const streak = effectiveStreak(st.streak, today);
  const dots = weekDots(st.days, today);
  const todayIdx = (new Date(today * 86400000).getUTCDay() + 6) % 7;
  const wk = daysThisWeek(st.days, today);
  const doneToday = st.days.includes(today);
  const pace = paceText(paceInfo({ untouched: cov.overall.new, newPerDay: st.settings.newPerDay, examDays }), st.settings.newPerDay);
  const started = UNIQUE_TOTAL - cov.overall.new;
  const stops = useMemo(() => {
    const list = STRANDS.map((s) => {
      const c = cov.byStrand[s.id] || { secure: 0, reviewing: 0, learning: 0, new: 0, total: 0 };
      const visited = c.total - c.new > 0;
      return { ...s, c, visited, stamped: c.total > 0 && c.secure / c.total >= STAMP_AT, here: false };
    });
    // "You are here": the unstamped stop furthest along, or the first stop if nothing has started.
    let best = null;
    for (const s of list) {
      if (s.stamped) continue;
      const f = s.c.total ? (s.c.total - s.c.new) / s.c.total : 0;
      if (!best || f > best.f) best = { s, f };
    }
    if (best) best.s.here = true;
    return list;
  }, [cov]);

  return (
    <>
      <div class="page-head">
        <h1>今日行程</h1>
        <div class="en">Today's trip{examDays != null && examDays >= 0 ? ` · ${examDays} days to the exam` : ''}</div>
      </div>

      <div class="hero">
        <section class="card practice" aria-label="今日行程 Today's trip">
          <div>
            <h2>{plan.total === 0 ? '今天的行程已完成' : doneToday ? '再走一程？' : '准备好出发了吗？'}</h2>
            <div class="small soft">{plan.total === 0 ? 'You have covered the day\'s route. Visit a stop below, or revisit your weak words.' : `About ${Math.max(2, Math.round(plan.total * 0.4))} minutes. Revisits first, then new discoveries.`}</div>
          </div>
          <div class="counts">
            <div><b class="tnum">{plan.reviews}</b><span>回访 Revisits</span></div>
            <div><b class="tnum">{plan.fresh}</b><span>新发现 New finds</span></div>
            <div><b class="tnum">{dueAll > SESSION_SIZE ? dueAll - plan.reviews : 0}</b><span>待复习 Waiting</span></div>
          </div>
          <div class="row">
            <button class="btn primary" disabled={plan.total === 0} onClick={() => go('#/session/daily')}>
              {doneToday ? '再走一程 Another leg' : '出发 Set off'}
            </button>
            <button class="btn ghost" onClick={() => go('#/write')}><Icon name="pen" /> 写字 Write{writePlan > 0 ? ` (${writePlan})` : ''}</button>
            {weakCount > 0 && (
              <button class="btn ghost" onClick={() => go('#/session/weak')}>重访弱项 Weak words ({weakCount})</button>
            )}
          </div>
        </section>

        <section class="card" aria-label="本周行程 This week">
          <div class="streak-row">
            <Icon name="flame" />
            <b class="tnum">{streak}</b>
            <span class="small soft">天连续出行 day streak</span>
          </div>
          <div class="week" role="img" aria-label={`本周已学习 ${wk} 天`}>
            {DAY_LABELS.map((l, i) => (
              <div key={l} class={`d${dots[i] ? ' on' : ''}${i === todayIdx ? ' today' : ''}`}>
                <i>{dots[i] ? <Icon name="check" /> : null}</i>
                {l}
              </div>
            ))}
          </div>
          <div class="small">
            本周 <b class="tnum">{wk}</b> / {WEEKLY_GOAL} 天{wk >= WEEKLY_GOAL ? '，目标达成' : ''}
            <div class="soft">Weekly goal: {WEEKLY_GOAL} days. {st.streak.freezes > 0 ? `You have ${st.streak.freezes} rest day${st.streak.freezes > 1 ? 's' : ''} banked, so one missed day will not break your streak.` : 'Study 7 days in a row to earn a rest day.'}</div>
          </div>
        </section>
      </div>

      <div class={`notice`} style={{ marginBottom: '22px' }}>
        <b>{pace.cn}</b>
        <div>{pace.en}</div>
        {examDays == null && <a href="#/progress" class="small">去设定 Set exam date →</a>}
      </div>

      <div class="row" style={{ justifyContent: 'space-between', margin: '0 0 14px' }}>
        <div>
          <h2 style={{ fontSize: '24px', color: 'var(--ink-strong)' }}>旅程地图</h2>
          <div class="small soft">Journey map · {started} of {UNIQUE_TOTAL} headwords visited, {cov.overall.secure} secure</div>
        </div>
        <Legend />
      </div>
      <ol class="route" aria-label="旅程地图 Journey map">
        {stops.map((s, n) => {
          const c = s.c;
          const cls = ['stop', s.stamped ? 'done' : s.visited ? 'begun' : '', s.here ? 'here' : ''].join(' ').trim();
          return (
            <li class={cls} key={s.id}>
              <div class="node" aria-hidden="true">
                {s.stamped ? (
                  <span class="stamp"><b>到此</b><b>一游</b></span>
                ) : (
                  <span class="pin">{s.id === 'idiom' ? '成' : s.num}</span>
                )}
              </div>
              <div class="tile">
                <a class="top" href={`#/words/${s.id}`}>
                  <span class="nm">
                    <em class="leg">{s.id === 'idiom' ? '特别站 Bonus stop' : `第 ${s.num} 站 Stop ${s.num}`}{s.stamped ? ' · 已盖章 Stamped' : ''}</em>
                    {s.cn}<small>{s.short}</small>
                  </span>
                  {s.here && <span class="here-tag"><Icon name="pin" /> 你在这里 You are here</span>}
                </a>
                <MasteryBar counts={c} />
                <div class="foot">
                  <span class="tnum">{c.secure} / {c.total} 已掌握{!s.stamped && c.total > 0 ? ` · 还差 ${Math.max(0, Math.ceil(c.total * STAMP_AT) - c.secure)} 个盖章` : ''}</span>
                  <button class="btn ghost small" onClick={() => go(`#/session/strand/${s.id}`)}>前往 Visit</button>
                </div>
              </div>
            </li>
          );
        })}
        <li class="stop dest">
          <div class="node" aria-hidden="true"><span class="flag"><Icon name="flag" /></span></div>
          <div class="tile">
            <span class="nm">
              <em class="leg">目的地 Destination</em>
              H1 华文考场<small>{examDays == null ? 'Set your exam date under Progress to see how far there is to go.' : examDays >= 0 ? `${examDays} days to go. Every stamp on the way is a mark you do not have to chase later.` : 'Exam date has passed.'}</small>
            </span>
          </div>
        </li>
      </ol>
    </>
  );
}
