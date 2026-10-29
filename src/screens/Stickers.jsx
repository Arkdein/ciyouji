import { useStore } from '../lib/store.js';
import { useToday } from '../lib/hooks.js';
import { STICKERS, GROUPS } from '../lib/stickers.js';
import { RANKS, XP, DAILY_GOAL, xpToday, stickerCount } from '../lib/game.js';
import { isoFromDay } from '../lib/dates.js';
import { StickerArt } from '../components/StickerArt.jsx';
import { RankBadge, RankMeter } from '../components/Game.jsx';

const EARN = [
  ['答对一题', 'Correct answer', XP.good],
  ['用了提示答对', 'Correct with a hint', XP.hint],
  ['答错也算努力', 'A miss still counts', XP.again],
  ['遇见新词', 'Meet a new word', XP.meet],
  ['完成一程', 'Finish a session', XP.session],
  ['当天首次学习', 'First study of the day', XP.studyDay],
  ['描完一个字', 'Trace a character', XP.traced],
  ['默写写对', 'Write from memory, clean', XP.wGood],
  ['获得贴纸', 'Earn a sticker', XP.sticker],
];

export function Stickers() {
  const st = useStore();
  const today = useToday();
  const g = st.game;
  const owned = g.stickers;
  const total = STICKERS.length;
  const gotToday = xpToday(st, today);

  return (
    <>
      <div class="page-head">
        <a href="#/" class="small no-print">← 返回行程 Back to the trip</a>
        <h1>贴纸册</h1>
        <div class="en">Sticker book · {stickerCount(st)} of {total} collected</div>
      </div>

      <section class="card rank-card">
        <div class="rank-hero">
          <RankBadge index={g.rank} size={84} />
          <div class="grow"><RankMeter xp={g.xp} /></div>
        </div>
        <div class="small" style={{ marginTop: 12 }}>
          今天已得 <b class="tnum">{gotToday}</b> / {DAILY_GOAL} XP
          <div class="dgoal"><i style={{ width: `${Math.min(100, Math.round((100 * gotToday) / DAILY_GOAL))}%` }} /></div>
        </div>
        <details class="ladder">
          <summary>所有等级与得分方式 All ranks and how XP works</summary>
          <ol class="ranks">
            {RANKS.map((r, i) => (
              <li key={r.cn} class={i <= g.rank ? 'got' : ''}>
                <RankBadge index={i} size={34} />
                <span><b>{r.cn}</b> <span class="soft">{r.en}</span></span>
                <span class="tnum soft">{r.xp} XP</span>
              </li>
            ))}
          </ol>
          <table class="earn">
            <tbody>
              {EARN.map(([cn, en, n]) => (
                <tr key={en}><td>{cn} <span class="soft">{en}</span></td><td class="num tnum">+{n}</td></tr>
              ))}
            </tbody>
          </table>
          <p class="small soft">经验值只用来记录你走了多远，不计入成绩。 XP only records how far you have travelled. It is never used for marks.</p>
        </details>
      </section>

      {GROUPS.map((grp) => {
        const list = STICKERS.filter((s) => s.group === grp.id);
        const n = list.filter((s) => s.id in owned).length;
        return (
          <section key={grp.id} style={{ marginTop: 24 }}>
            <div class="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 22, color: 'var(--ink-strong)' }}>{grp.cn}</h2>
                <div class="small soft">{grp.en}</div>
              </div>
              <span class="chip tnum">{n} / {list.length}</span>
            </div>
            <div class="sticker-grid">
              {list.map((s) => {
                const got = s.id in owned;
                return (
                  <article key={s.id} class={`sticker${got ? ' got' : ''}`}>
                    <StickerArt id={s.id} size={104} locked={!got} />
                    <div class="s-name">{got ? s.cn : '？？？'}</div>
                    <div class="s-en small soft">{got ? s.en : 'Locked'}</div>
                    <div class="s-how small soft">{got ? `${isoFromDay(owned[s.id])}` : `${s.how.cn}`}</div>
                    {!got && <div class="s-how small soft">{s.how.en}</div>}
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
    </>
  );
}
