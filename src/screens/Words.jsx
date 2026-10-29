import { useMemo, useState } from 'preact/hooks';
import { useStore } from '../lib/store.js';
import { go } from '../lib/hooks.js';
import { STRANDS, STRAND_BY_ID, itemsOf } from '../lib/vocab.js';
import { statusOf } from '../lib/srs.js';
import { Tianzige, AudioBtn } from '../components/Shared.jsx';

const FILTERS = [
  ['all', '全部 All'],
  ['t1', '常用 Tier 1'],
  ['new', '未学 New'],
  ['learning', '学习中 Learning'],
  ['reviewing', '复习中 Reviewing'],
  ['secure', '已掌握 Secure'],
];
const STATUS_LABEL = { new: '未学', learning: '学习中', reviewing: '复习中', secure: '已掌握' };

export function Words({ strand }) {
  const st = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const meta = STRAND_BY_ID[strand] || STRANDS[0];
  const items = useMemo(() => itemsOf(meta.id), [meta.id]);
  const ql = q.trim().toLowerCase();

  const shown = items.filter((it) => {
    const status = statusOf(st.cards[it.w]);
    if (filter === 't1' && it.tier !== 1) return false;
    if (['new', 'learning', 'reviewing', 'secure'].includes(filter) && status !== filter) return false;
    if (!ql) return true;
    return it.w.includes(q.trim()) || it.py.toLowerCase().includes(ql) || it.cn.includes(q.trim()) || it.en.toLowerCase().includes(ql);
  });

  return (
    <>
      <div class="page-head">
        <h1>词汇库</h1>
        <div class="en">Word bank · {STRANDS.reduce((n, s) => n + itemsOf(s.id).length, 0)} entries across 9 strands and the idiom bank</div>
      </div>
      <div class="words-layout">
        <nav class="strand-list" aria-label="主题 Strands">
          {STRANDS.map((s) => (
            <a key={s.id} href={`#/words/${s.id}`} class={s.id === meta.id ? 'active' : ''}>
              <span class={`idx${s.id === 'idiom' ? ' idiom' : ''}`}>{s.id === 'idiom' ? '成' : s.num}</span>
              <span class="nm">{s.cn}</span>
            </a>
          ))}
        </nav>
        <section>
          <div class="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2 style={{ fontSize: 24, color: 'var(--ink-strong)' }}>{meta.cn}</h2>
              <div class="small soft">{meta.en}</div>
            </div>
            <button class="btn primary small" onClick={() => go(`#/session/strand/${meta.id}`)}>练习这一组 Practise this list</button>
          </div>
          <div class="notice" style={{ marginTop: 12 }}><b>考场应用 Exam tip：</b>{meta.tip}</div>
          <div class="toolbar">
            <input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="搜索词语、拼音、释义… Search" aria-label="搜索 Search" />
          </div>
          <div class="chips" role="group" aria-label="筛选 Filter">
            {FILTERS.map(([k, label]) => (
              <button key={k} class={`chip${filter === k ? ' active' : ''}`} onClick={() => setFilter(k)}>{label}</button>
            ))}
          </div>
          <div class="small soft" style={{ margin: '12px 0' }}>{shown.length} / {items.length} 词条 entries</div>
          <div class="wgrid">
            {shown.map((it) => {
              const status = statusOf(st.cards[it.w]);
              return (
                <article key={it.id} class={`wcard${it.tier === 1 && it.t === 'w' ? ' t1' : ''}`}>
                  <div class="head">
                    <Tianzige ch={it.w[0]} />
                    <div class="grow">
                      <div class="hw">{it.w}<AudioBtn item={it} /></div>
                      <div class="pinyin small">{it.py}</div>
                    </div>
                    {it.t === 'w' && it.tier === 1 && <span class="badge">常用</span>}
                  </div>
                  <div class="cn">{it.cn}</div>
                  <div class="en">{it.en}</div>
                  <div class="exs"><span>{it.ex}</span><AudioBtn item={it} part="ex" /></div>
                  <div class="row small soft" style={{ justifyContent: 'space-between' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i class={`dot ${status}`} /> {STATUS_LABEL[status]}</span>
                    <a class="btn ghost small" href={`#/write/word/${it.id}`}>写一写 Write</a>
                    {it.src && <span class="src">来源 {it.src}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
