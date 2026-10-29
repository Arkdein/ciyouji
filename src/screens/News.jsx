import { useEffect, useMemo, useState } from 'preact/hooks';
import { STRANDS, STRAND_BY_ID } from '../lib/vocab.js';
import { useStore } from '../lib/store.js';
import { useToday, loadConfig } from '../lib/hooks.js';
import { loadFeed, groupByWeek } from '../lib/newsfeed.js';
import { dayFromIso, isoFromDay } from '../lib/dates.js';

const SRC_CLASS = (s) => (/早报|zaobao/i.test(s) ? 'zb' : /8world|新传媒|mediacorp/i.test(s) ? 'e8' : /cna|channel/i.test(s) ? 'cna' : '');

function Card({ it, showStrand, showEn }) {
  const s = STRAND_BY_ID[it.strand];
  return (
    <article class="pick">
      <div class="meta">
        {it.source && <span class={`src ${SRC_CLASS(it.source)}`}>{it.source}</span>}
        {it.published && <span class="soft small tnum">{it.published}</span>}
        {showStrand && s && <a class="tag" href={`#/news/${s.id}`}>{s.id === 'idiom' ? '成语' : `${s.num} ${s.cn}`}</a>}
      </div>
      <h2><a href={it.url} target="_blank" rel="noopener noreferrer">{it.title}</a></h2>
      {it.hookCn && <p class="hook">{it.hookCn}</p>}
      {showEn && it.hookEn && <p class="hook en">{it.hookEn}</p>}
      <a class="btn ghost small" href={it.url} target="_blank" rel="noopener noreferrer">阅读原文 Read the article ↗</a>
    </article>
  );
}

export function News({ strand }) {
  const st = useStore();
  const today = useToday();
  const [feed, setFeed] = useState({ state: 'loading', items: [] });
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let dead = false;
    setFeed((f) => (f.state === 'loading' ? f : { ...f, state: 'loading' }));
    loadConfig().then((c) => loadFeed(c.newsFeedUrl)).then((f) => !dead && setFeed(f));
    return () => { dead = true; };
  }, [reload]);

  const sel = strand && strand !== 'all' && STRAND_BY_ID[strand] ? strand : 'all';
  const meta = sel === 'all' ? null : STRAND_BY_ID[sel];
  const shown = useMemo(() => feed.items.filter((i) => sel === 'all' || i.strand === sel), [feed.items, sel]);
  const groups = useMemo(() => groupByWeek(shown), [shown]);
  const countBy = useMemo(() => {
    const m = {};
    for (const i of feed.items) m[i.strand] = (m[i.strand] || 0) + 1;
    return m;
  }, [feed.items]);

  const weekLabel = (w, first) => {
    const d = dayFromIso(w);
    if (d == null) return '近期 Recent';
    return first && today - d <= 9 ? `本周 This week · ${w}` : `之前 Earlier · ${w}`;
  };

  return (
    <>
      <div class="page-head">
        <h1>本周时事</h1>
        <div class="en">This week's local news · picked by your teacher; links open the original article</div>
      </div>

      <div class="chips" role="group" aria-label="主题 Themes" style={{ marginBottom: 16 }}>
        <a href="#/news/all" class={`chip${sel === 'all' ? ' active' : ''}`} style={{ textDecoration: 'none' }}>全部 All{feed.items.length ? ` (${feed.items.length})` : ''}</a>
        {STRANDS.filter((s) => s.id !== 'idiom').map((s) => (
          <a key={s.id} href={`#/news/${s.id}`} class={`chip${s.id === sel ? ' active' : ''}`} style={{ textDecoration: 'none' }}>
            {s.num} {s.cn}{countBy[s.id] ? ` (${countBy[s.id]})` : ''}
          </a>
        ))}
      </div>

      <div class="notice" style={{ marginBottom: 18 }}>
        <b>读后小任务 After reading:</b> 用本主题词汇库里的 2 个词，写两句话概括这篇报道。
        <div>Summarise the article in two sentences using 2 words from {meta ? 'this theme' : 'a theme'}'s word bank.
          {meta && <> <a href={`#/words/${meta.id}`}>打开 {meta.short} 词汇 Open the words →</a></>}
        </div>
      </div>

      {feed.state === 'loading' && <div class="soft">载入中… Loading…</div>}
      {feed.state === 'unconfigured' && (
        <div class="card"><h2>时事推荐还没有开通</h2><div class="small soft">The weekly list has not been connected yet. Your teacher will switch it on soon.</div></div>
      )}
      {feed.state === 'error' && (
        <div class="card">
          <h2>暂时连不上</h2>
          <div class="small soft">Could not load this week's list and there is no saved copy on this device. Check your connection and try again.</div>
          <div class="row" style={{ marginTop: 10 }}><button class="btn ghost small" onClick={() => setReload((n) => n + 1)}>重试 Try again</button></div>
        </div>
      )}
      {feed.state === 'cache' && (
        <div class="notice" style={{ marginBottom: 14 }}>离线：显示这台设备上次保存的列表（{isoFromDay(Math.floor(feed.t / 86400000))}）。 Offline: showing the list last saved on this device.</div>
      )}

      {(feed.state === 'live' || feed.state === 'cache') && shown.length === 0 && (
        <div class="card"><h2>这个主题本周还没有推荐</h2><div class="small soft">No picks for {meta ? meta.short : 'this view'} yet. New picks are added every Monday after your teacher has checked them.</div></div>
      )}

      {groups.map((g, gi) => (
        <section key={g.week} style={{ marginBottom: 22 }}>
          <h3 class="wk">{weekLabel(g.week, gi === 0)}</h3>
          <div class="picks">
            {g.list.map((it) => <Card key={it.url} it={it} showStrand={sel === 'all'} showEn={st.settings.showEn} />)}
          </div>
        </section>
      ))}

      {(feed.state === 'live' || feed.state === 'cache') && (
        <div class="small soft">部分文章可能需要订阅或登入才能阅读。 Some articles may need a subscription or sign-in. Links open the publisher's own site.</div>
      )}
    </>
  );
}
