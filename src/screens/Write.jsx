import { useMemo, useState, useEffect, useRef } from 'preact/hooks';
import { useStore, update, getState } from '../lib/store.js';
import { useToday, go } from '../lib/hooks.js';
import { VOCAB, BY_ID } from '../lib/vocab.js';
import { statusOf } from '../lib/srs.js';
import { writeIntroduce, writeAnswer, markStudied, writtenIntroducedToday, finishWriteSession } from '../lib/progress.js';
import { buildWriteQueue, buildWordQueue, writingPool, charsOf, syllableFor, outcomeForMistakes } from '../lib/writing.js';
import { HanziPad } from '../components/HanziPad.jsx';
import { Icon } from '../components/Icon.jsx';
import { AudioBtn, Highlighted } from '../components/Shared.jsx';

const STATUS_LABEL = { new: '未学', learning: '学习中', reviewing: '复习中', secure: '已掌握' };

/* ---------- Writing home: today's plan and the character wall ---------- */
export function Write() {
  const st = useStore();
  const today = useToday();
  const plan = useMemo(
    () => buildWriteQueue({ vocab: VOCAB, cards: st.cards, wcards: st.writing.cards, today, introducedToday: writtenIntroducedToday(st, today) }),
    [st.cards, st.writing, today],
  );
  const pool = useMemo(() => writingPool(VOCAB, st.cards), [st.cards]);
  const wall = Object.keys(st.writing.cards);
  const due = plan.filter((e) => !e.intro).length;
  const fresh = plan.length - due;

  return (
    <>
      <div class="page-head">
        <h1>书写练习</h1>
        <div class="en">Handwriting practice · trace with your finger, then write from memory</div>
      </div>

      <section class="card practice">
        <div>
          <h2>{pool.size === 0 ? '先学几个词，再来写字' : plan.length === 0 ? '今天的书写已完成' : '今天要写的字'}</h2>
          <div class="small soft">
            {pool.size === 0
              ? 'Characters appear here once you have met their words in a Trip session.'
              : plan.length === 0
                ? 'Nothing is due. Tap a character below to practise it, or learn more words first.'
                : 'Revisits come from memory. New characters start with a stroke-order demo and a guided trace.'}
          </div>
        </div>
        <div class="counts">
          <div><b class="tnum">{due}</b><span>默写 From memory</span></div>
          <div><b class="tnum">{fresh}</b><span>新字 New characters</span></div>
          <div><b class="tnum">{wall.length}</b><span>已开始 Started</span></div>
        </div>
        <div class="row">
          <button class="btn primary" disabled={plan.length === 0} onClick={() => go('#/write/session')}>
            <Icon name="pen" /> 开始书写 Start writing
          </button>
        </div>
        <div class="small soft">手机或平板最顺手，用手指写；电脑上可以用鼠标。 Works best on a phone or tablet. On a computer, use the mouse. Writing has its own progress and never blocks a word from becoming secure.</div>
      </section>

      {wall.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 22, color: 'var(--ink-strong)' }}>我的字</h2>
          <div class="small soft" style={{ marginBottom: 12 }}>My characters · tap one to practise it again</div>
          <div class="charwall">
            {wall.map((ch) => {
              const c = st.writing.cards[ch];
              const s = statusOf(c);
              return (
                <a key={ch} class={`cw ${s}`} href={`#/write/char/${encodeURIComponent(ch)}`} aria-label={`${ch} ${STATUS_LABEL[s]}`}>
                  {ch}
                </a>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}

/* ---------- Writing session ---------- */
const itemFor = (e) => BY_ID[e.itemId];

function buildInitial(mode, arg) {
  const s = getState();
  const today = Math.floor(Date.now() / 86400000);
  if (mode === 'word') {
    const it = BY_ID[arg];
    return it ? buildWordQueue(it, s.writing.cards) : [];
  }
  if (mode === 'char') {
    const it = VOCAB.find((v) => v.w.includes(arg) && s.cards[v.w]) || VOCAB.find((v) => v.w.includes(arg));
    return it ? [{ char: arg, itemId: it.id, intro: !s.writing.cards[arg] }] : [];
  }
  return buildWriteQueue({ vocab: VOCAB, cards: s.cards, wcards: s.writing.cards, today, introducedToday: writtenIntroducedToday(s, today) });
}

export function WriteRun({ mode, arg }) {
  const st = useStore();
  const today = useToday();
  const [queue, setQueue] = useState(() => buildInitial(mode, arg));
  const [idx, setIdx] = useState(0);
  const [padMode, setPadMode] = useState(() => (queue[0]?.intro ? 'watch' : 'quiz'));
  const [phase, setPhase] = useState(() => (queue[0]?.intro ? 'watch' : 'quiz'));
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState(null);
  const [strokesLeft, setStrokesLeft] = useState(null);
  const [slips, setSlips] = useState(0);
  const [retried, setRetried] = useState(() => new Set());
  const [stats, setStats] = useState({ answered: 0, clean: 0, intros: 0, log: [] });
  const xp0 = useRef(getState().game.xp).current;
  const [note, setNote] = useState('');

  const e = queue[idx];
  const done = idx >= queue.length;
  const item = e && itemFor(e);

  useEffect(() => {
    if (!e) return;
    setPadMode(e.intro ? 'watch' : 'quiz');
    setPhase(e.intro ? 'watch' : 'quiz');
    setResult(null);
    setStrokesLeft(null);
    setSlips(0);
    setRunKey((k) => k + 1);
  }, [idx]);

  // A finished session counts as a study day.
  useEffect(() => {
    if (done && queue.length && stats.answered + stats.intros > 0) update((s) => finishWriteSession(markStudied(s, today), stats, today));
  }, [done]);

  const leave = () => go('#/write');
  const next = () => { setNote(''); setIdx((i) => i + 1); };

  const onComplete = ({ mistakes }) => {
    if (phase === 'trace') {
      update((s) => writeIntroduce(s, e.char, today));
      setStats((t) => ({ ...t, intros: t.intros + 1, log: [...t.log, { ch: e.char, kind: 'new' }] }));
      setResult({ kind: 'intro' });
      setPhase('feedback');
    } else if (phase === 'quiz') {
      const outcome = outcomeForMistakes(mistakes);
      update((s) => writeAnswer(s, e.char, outcome, today));
      setStats((t) => ({ ...t, answered: t.answered + 1, clean: t.clean + (outcome === 'again' ? 0 : 1), log: [...t.log, { ch: e.char, kind: outcome }] }));
      setResult({ kind: outcome, mistakes });
      setPhase('feedback');
      if (outcome === 'again' && !retried.has(e.char)) {
        setRetried(new Set([...retried, e.char]));
        setQueue((q) => [...q, { ...e, intro: false, retry: true }]);
      }
    }
  };

  const giveUp = () => {
    update((s) => writeAnswer(s, e.char, 'again', today));
    setStats((t) => ({ ...t, answered: t.answered + 1, log: [...t.log, { ch: e.char, kind: 'again' }] }));
    setResult({ kind: 'again', gaveUp: true });
    setPhase('feedback');
    setPadMode('watch');
    setRunKey((k) => k + 1);
    if (!retried.has(e.char)) {
      setRetried(new Set([...retried, e.char]));
      setQueue((q) => [...q, { ...e, intro: false, retry: true }]);
    }
  };

  const startTrace = () => { setPhase('trace'); setPadMode('trace'); setSlips(0); setStrokesLeft(null); setRunKey((k) => k + 1); };
  const replay = () => { setPadMode('watch'); setRunKey((k) => k + 1); };
  const noData = () => { setNote(`暂时没有「${e.char}」的笔顺数据，已跳过。 No stroke data for this character; skipped.`); setIdx((i) => i + 1); };

  if (!queue.length) {
    return (
      <div class="focus"><div class="summary">
        <h1>没有可写的字</h1>
        <p class="soft">Nothing to write yet. Learn a few words in a Trip session first, then come back.</p>
        <div class="row" style={{ justifyContent: 'center' }}><button class="btn primary" onClick={() => go('#/')}>回到首页 Home</button></div>
      </div></div>
    );
  }

  if (done) {
    const total = stats.answered;
    const pct = total ? Math.round((100 * stats.clean) / total) : null;
    return (
      <div class="focus"><div class="summary">
        <h1>本程书写完成</h1>
        <p class="soft">{total === 0 ? '新字已记下，明天从记忆里写写看。 New characters are saved. You will write them from memory tomorrow.' : pct >= 80 ? '写得稳！ Steady hands.' : '写错的字稍后还会出现，多写几次就熟了。 Misses come back; that is how they stick.'}</p>
        <div class="stats3">
          <div><b class="tnum">{stats.answered}</b><span>默写 From memory</span></div>
          <div><b class="tnum">{pct == null ? '—' : `${pct}%`}</b><span>写对 Correct</span></div>
          <div><b class="tnum">{stats.intros}</b><span>新字 New</span></div>
        </div>
        <div class="xp-gain" role="status">+{Math.max(0, getState().game.xp - xp0)} XP</div>
        <div class="charwall" style={{ justifyContent: 'center' }}>
          {stats.log.map((l, i) => <span key={i} class={`cw ${l.kind === 'again' ? 'learning' : l.kind === 'new' ? 'new' : 'secure'}`}>{l.ch}</span>)}
        </div>
        <div class="row" style={{ justifyContent: 'center' }}>
          <button class="btn primary" onClick={leave}>回到书写 Back to Write</button>
          <button class="btn ghost" onClick={() => go('#/')}>回到首页 Home</button>
        </div>
      </div></div>
    );
  }

  const idxInWord = charsOf(item.w).indexOf(e.char);
  const syl = syllableFor(item, idxInWord);
  const hide = phase === 'quiz';
  const show = !hide;
  const wordParts = [...item.w].map((c, i) => (c === e.char ? (show ? <b key={i} class="tgt">{c}</b> : <span key={i} class="blank-ch">＿</span>) : <span key={i}>{c}</span>));
  const kindLabel = e.intro ? (phase === 'trace' ? '描一描 Trace it' : '看笔顺 Watch the strokes') : e.retry ? '再写一次 Try again' : '默写 Write it from memory';
  const progress = Math.round((100 * idx) / queue.length);

  return (
    <div class="focus">
      <div class="focus-top">
        <button class="close-btn" onClick={leave} aria-label="退出 Quit"><Icon name="close" /></button>
        <div class="pbar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${progress}%` }} /></div>
        <span class="small soft tnum">{Math.min(idx + 1, queue.length)}/{queue.length}</span>
      </div>

      <div class="ex">
        <div class="kind">书写 · {kindLabel}</div>
        {note && <div class="notice">{note}</div>}
        <div class="write-ctx">
          <div class="word">{wordParts}</div>
          <div class="row" style={{ gap: 8 }}>
            <span class="pinyin">{syl || item.py}</span>
            <AudioBtn item={item} />
          </div>
          <div class="def">{item.cn}</div>
          {st.settings.showEn && <div class="small soft" style={{ fontStyle: 'italic' }}>{item.en}</div>}
          {hide && <div class="small soft">写出空格里的字。 Write the missing character.</div>}
        </div>

        <HanziPad
          char={e.char}
          mode={padMode}
          runKey={runKey}
          onComplete={onComplete}
          onMistake={() => setSlips((n) => n + 1)}
          onStroke={(d) => setStrokesLeft(d.strokesRemaining)}
          onError={noData}
        />
        <div class="small soft" style={{ textAlign: 'center', minHeight: 20 }}>
          {phase === 'quiz' || phase === 'trace' ? `错笔 Slips ${slips}${strokesLeft != null ? ` · 还剩 ${strokesLeft} 笔` : ''}` : ''}
        </div>

        {phase === 'watch' && (
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost" onClick={replay}>重播 Replay</button>
            <button class="btn primary" onClick={startTrace}>我来描 Trace it</button>
          </div>
        )}
        {phase === 'trace' && (
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost small" onClick={() => { setPhase('watch'); replay(); }}>再看笔顺 Watch again</button>
          </div>
        )}
        {phase === 'quiz' && (
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn ghost small" onClick={giveUp}>不会 Show me</button>
          </div>
        )}

        {phase === 'feedback' && result && (
          <div class={`feedback ${result.kind === 'again' ? 'no' : 'ok'}`} role="status">
            <div class="head">
              <Icon name={result.kind === 'again' ? 'cross' : 'check'} />
              {result.kind === 'intro' && '记下了！明天从记忆里写写看。 Saved. You will write it from memory tomorrow.'}
              {result.kind === 'good' && '写对了！ Perfect, no slips.'}
              {result.kind === 'hint' && `写对了，有 ${result.mistakes} 个错笔或提示，明天再写。 Correct with ${result.mistakes} slip${result.mistakes > 1 ? 's' : ''}; it will come back tomorrow.`}
              {result.kind === 'again' && (result.gaveUp ? '看一下笔顺，稍后再写一次。 Watch the strokes; you will try again shortly.' : '错笔较多，稍后再写一次。 Too many slips; you will try again shortly.')}
            </div>
            <div class="entry">
              <div class="hw">{item.w} <span class="pinyin" style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>{item.py}</span> <AudioBtn item={item} /></div>
              <div class="ex-s"><span><Highlighted text={item.ex} word={e.char} /></span><AudioBtn item={item} part="ex" /></div>
            </div>
            {padMode === 'watch' && <button class="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={replay}>重播 Replay</button>}
          </div>
        )}
      </div>

      <div class="sticky-bottom">
        {phase === 'feedback' && <button class="btn primary" onClick={next}>{idx + 1 >= queue.length ? '完成 Finish' : '继续 Continue'}</button>}
      </div>
    </div>
  );
}
