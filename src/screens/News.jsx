import { useState } from 'preact/hooks';
import { STRANDS, STRAND_BY_ID, NEWS, VOCAB } from '../lib/vocab.js';
import { Icon } from '../components/Icon.jsx';
import { AudioBtn } from '../components/Shared.jsx';

const byWord = new Map();
for (const v of VOCAB) if (!byWord.has(v.w)) byWord.set(v.w, v);

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function Body({ text, words, onPick }) {
  const sorted = [...words].sort((a, b) => b.length - a.length);
  const re = new RegExp(`(${sorted.map(escapeRe).join('|')})`, 'g');
  const set = new Set(words);
  return (
    <>
      {text.split(re).map((p, i) =>
        set.has(p) ? (
          <mark key={i} role="button" tabIndex={0} onClick={() => onPick(p)} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onPick(p)}>{p}</mark>
        ) : (
          p
        )
      )}
    </>
  );
}

/** Turn bare URLs in a citation into links. */
function Cite({ text }) {
  const parts = text.split(/(https?:\/\/\S+)/g);
  return (
    <>
      {parts.map((p, i) => (/^https?:\/\//.test(p) ? <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p}</a> : p))}
    </>
  );
}

export function News({ strand }) {
  const [picked, setPicked] = useState(null);
  const meta = STRAND_BY_ID[strand] && strand !== 'idiom' ? STRAND_BY_ID[strand] : STRANDS[0];
  const items = NEWS.filter((n) => n.s === meta.id);
  const entry = picked ? byWord.get(picked) : null;

  return (
    <>
      <div class="page-head">
        <h1>时事新闻</h1>
        <div class="en">News snippets · original summaries of real 联合早报 reports; tap a highlighted word</div>
      </div>
      <div class="chips" role="group" aria-label="主题 Strands" style={{ marginBottom: 18 }}>
        {STRANDS.filter((s) => s.id !== 'idiom').map((s) => (
          <a key={s.id} href={`#/news/${s.id}`} class={`chip${s.id === meta.id ? ' active' : ''}`} style={{ textDecoration: 'none' }}>{s.num} {s.cn}</a>
        ))}
      </div>
      <div class="news-list">
        {items.map((n) => (
          <article class="news" key={n.id}>
            <h2>{n.title}<small>{n.titleEn}</small></h2>
            <p class="body" style={{ margin: '10px 0 0' }}><Body text={n.body} words={n.hl} onPick={setPicked} /></p>
            <div class="cite">出处 Source: <Cite text={n.source} /></div>
            <div class="tip"><b>考场应用 Exam tip：</b>{n.tip}</div>
          </article>
        ))}
      </div>
      {picked && (
        <div class="sheet" role="dialog" aria-label="词语释义 Word meaning">
          <button class="x" onClick={() => setPicked(null)} aria-label="关闭 Close"><Icon name="close" /></button>
          <div class="in">
            <div class="hw">{picked}{entry && <AudioBtn item={entry} />}</div>
            {entry ? (
              <>
                <div class="py">{entry.py}</div>
                <div>{entry.cn}</div>
                <div class="en">{entry.en}</div>
              </>
            ) : (
              <div class="en">本词不在词汇表内，是这篇报道里的相关用词。 Not in the word lists; useful vocabulary from this report.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
