import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getState, update, useStore } from '../lib/store.js';
import { go } from '../lib/hooks.js';
import { VOCAB, BY_ID, STRAND_BY_ID } from '../lib/vocab.js';
import { dayNumber, dayFromIso } from '../lib/dates.js';
import { buildQueue, requeueMissed, scheduleCheck } from '../lib/session.js';
import { kindForCard, buildExercise, checkTyped } from '../lib/exercises.js';
import { answerCard, introduceCard, introducedToday, markStudied } from '../lib/progress.js';
import { effectiveStreak, weekDots } from '../lib/streak.js';
import { Icon } from '../components/Icon.jsx';
import { AudioBtn, Tianzige, Highlighted } from '../components/Shared.jsx';
import { audioAvailable, play, useAudioReady } from '../lib/audio.js';

const KIND_LABEL = {
  intro: ['新词', 'New word'],
  mcDef: ['选出正确的解释', 'Choose the meaning'],
  mcWord: ['选出合适的词语', 'Choose the word'],
  cloze: ['例句填空', 'Fill in the blank'],
  type: ['默写', 'Write the word'],
  dictation: ['听写', 'Dictation'],
};

export function Session({ mode, strand }) {
  const [run, setRun] = useState(0);
  return <SessionRun key={run} mode={mode} strand={strand} onAgain={() => setRun((n) => n + 1)} />;
}

function SessionRun({ mode, strand, onAgain }) {
  const today = useRef(dayNumber()).current;
  const audioReady = useAudioReady();
  const st = useStore();

  const initial = useMemo(() => {
    const s = getState();
    const examDays = s.exam.date ? dayFromIso(s.exam.date) - today : null;
    return buildQueue({
      vocab: VOCAB, cards: s.cards, today, mode, strand, newLimit: s.settings.newPerDay,
      introducedToday: introducedToday(s, today), examDays, focus: s.settings.focus, rng: Math.random,
    });
  }, []);

  const makeExercise = (entry) => {
    const item = BY_ID[entry.itemId];
    if (entry.intro) return { kind: 'intro', item, key: entry.key };
    const s = getState();
    const kind = kindForCard(s.cards[entry.key], item, { audioOk: audioAvailable() && !s.settings.quiet, rng: Math.random });
    return buildExercise({ item, kind, vocab: VOCAB });
  };

  const [queue, setQueue] = useState(initial);
  const [idx, setIdx] = useState(0);
  const [ex, setEx] = useState(() => (initial.length ? makeExercise(initial[0]) : null));
  const [phase, setPhase] = useState(initial.length ? 'ask' : 'done');
  const [picked, setPicked] = useState(null);
  const [typed, setTyped] = useState('');
  const [hintUsed, setHintUsed] = useState(false);
  const [result, setResult] = useState(null);
  const [note, setNote] = useState('');
  const stats = useRef({ answered: 0, correct: 0, intros: 0, secured: [], retried: new Set() }).current;
  const inputRef = useRef(null);

  const advance = (q, i) => {
    if (i >= q.length) {
      if (stats.answered > 0 || stats.intros > 0) update((s) => markStudied(s, today));
      setQueue(q);
      setIdx(i);
      setPhase('done');
      return;
    }
    setQueue(q);
    setIdx(i);
    setEx(makeExercise(q[i]));
    setPhase('ask');
    setPicked(null);
    setTyped('');
    setHintUsed(false);
    setResult(null);
    setNote('');
  };

  const grade = (outcome) => {
    const e = queue[idx];
    const before = getState().cards[e.key];
    update((s) => answerCard(s, e.key, outcome, today));
    const after = getState().cards[e.key];
    stats.answered++;
    if (outcome !== 'again') stats.correct++;
    if (after.b === 5 && (!before || before.b < 5)) stats.secured.push(e.key);
    let retry = false;
    if (outcome === 'again' && !stats.retried.has(e.key)) {
      stats.retried.add(e.key);
      setQueue(requeueMissed(queue, idx, e));
      retry = true;
    }
    setResult({ outcome, retry });
    setPhase('feedback');
  };

  const choose = (i) => {
    if (phase !== 'ask') return;
    setPicked(i);
    grade(ex.options[i].correct ? 'good' : 'again');
  };
  const submitTyped = () => {
    if (phase !== 'ask') return;
    const r = checkTyped(typed, ex.item);
    if (r === 'pinyin') return setNote('请输入汉字，不是拼音。 Type the characters, not pinyin.');
    if (r === 'empty' || !typed.trim()) return setNote('先输入答案，或点「不会」。 Type an answer, or tap "I don\'t know".');
    grade(r === 'correct' ? (hintUsed ? 'hint' : 'good') : 'again');
  };
  const giveUp = () => phase === 'ask' && grade('again');
  const ackIntro = () => {
    const e = queue[idx];
    update((s) => introduceCard(s, e.key, today));
    stats.intros++;
    advance(scheduleCheck(queue, idx, e), idx + 1);
  };
  const next = () => advance(queue, idx + 1);

  // keyboard: Enter continues, 1-4 picks an option
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (phase === 'feedback' && e.key === 'Enter') next();
      else if (phase === 'ask' && ex?.kind === 'intro' && e.key === 'Enter') ackIntro();
      else if (phase === 'ask' && ex?.options && /^[1-4]$/.test(e.key)) choose(+e.key - 1);
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  });

  // dictation: say the word as soon as the card appears; focus the box for typed answers
  useEffect(() => {
    if (phase !== 'ask' || !ex) return;
    if (ex.kind === 'dictation') setTimeout(() => play(ex.item, 'w'), 250);
    if (ex.kind === 'type' || ex.kind === 'dictation') setTimeout(() => inputRef.current?.focus(), 50);
  }, [ex, phase]);

  const leave = () => go('#/');
  const showEn = st.settings.showEn;

  if (phase === 'done') {
    const total = stats.answered;
    const pct = total ? Math.round((100 * stats.correct) / total) : 0;
    const dots = weekDots(st.days, today);
    return (
      <div class="focus">
        <div class="summary">
          {initial.length === 0 ? (
            <>
              <h1>今天没有要练的词</h1>
              <p class="soft">Nothing is due and today's new-word quota is used up. Come back tomorrow, or practise a list from the Today screen.</p>
            </>
          ) : (
            <>
              <h1>本程完成</h1>
              <p class="soft">Session complete. {pct >= 80 ? '稳！ Solid work.' : pct >= 50 ? '有进步，错的词会再出现。 Misses will come back.' : '错的词会再出现，多练几次就熟了。 Misses will come back; that is how they stick.'}</p>
              <div class="stats3">
                <div><b class="tnum">{total}</b><span>题目 Answers</span></div>
                <div><b class="tnum">{pct}%</b><span>答对 Correct</span></div>
                <div><b class="tnum">{stats.intros}</b><span>新词 New words</span></div>
              </div>
              {stats.secured.length > 0 && (
                <div class="notice" style={{ width: '100%' }}>
                  <b>新掌握 Now secure:</b> {stats.secured.slice(0, 12).join('、')}
                </div>
              )}
              <div class="week" style={{ width: '100%', maxWidth: 320 }}>
                {['一', '二', '三', '四', '五', '六', '日'].map((l, i) => (
                  <div key={l} class={`d${dots[i] ? ' on' : ''}`}>
                    <i>{dots[i] ? <Icon name="check" /> : null}</i>
                    {l}
                  </div>
                ))}
              </div>
              <div class="small soft">连续 {effectiveStreak(st.streak, today)} 天 · {effectiveStreak(st.streak, today)}-day streak</div>
            </>
          )}
          <div class="row" style={{ justifyContent: 'center' }}>
            <button class="btn primary" onClick={leave}>回到首页 Home</button>
            {initial.length > 0 && mode === 'daily' && <button class="btn ghost" onClick={onAgain}>再练一轮 Another round</button>}
          </div>
        </div>
      </div>
    );
  }

  const item = ex.item;
  const [cn, en] = KIND_LABEL[ex.kind];
  const progress = Math.min(100, Math.round((100 * idx) / queue.length));
  const strandName = STRAND_BY_ID[item.s]?.cn;
  const lastCard = idx + 1 >= queue.length;
  const opts = ex.options;

  return (
    <div class="focus">
      <div class="focus-top">
        <button class="close-btn" onClick={leave} aria-label="退出 Quit"><Icon name="close" /></button>
        <div class="pbar" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100"><i style={{ width: `${progress}%` }} /></div>
        <span class="small soft tnum">{Math.min(idx + 1, queue.length)}/{queue.length}</span>
      </div>

      <div class="ex">
        <div class="kind">{cn} · {en}{strandName ? <span class="soft" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}> · {strandName}</span> : null}</div>

        {ex.kind === 'intro' && (
          <div class="intro-card">
            <div class="hw">
              <Tianzige ch={item.w[0]} big />
              <div>
                <div class="t">{item.w}</div>
                <div class="pinyin" style={{ fontSize: 18 }}>{item.py}</div>
              </div>
              <AudioBtn item={item} large />
            </div>
            <div class="def">{item.cn}</div>
            {showEn && <div class="soft" style={{ fontStyle: 'italic' }}>{item.en}</div>}
            <div class="card" style={{ width: '100%', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 17, lineHeight: 1.8 }}><Highlighted text={item.ex} word={item.w} /></div>
              <AudioBtn item={item} part="ex" />
            </div>
            <div class="small soft">读一读、听一听，几张卡片之后会考你。 You will be quizzed on this word a few cards from now.</div>
          </div>
        )}

        {ex.kind === 'mcDef' && (
          <div class="prompt">「<span class="w">{item.w}</span>」 <span class="pinyin">{item.py}</span> <AudioBtn item={item} /> 的意思是？</div>
        )}
        {ex.kind === 'mcWord' && (
          <div class="prompt">哪个词语符合这个解释？<br /><span>{item.cn}</span>{showEn && <div class="small soft" style={{ fontStyle: 'italic' }}>{item.en}</div>}</div>
        )}
        {ex.kind === 'cloze' && (
          <div class="sentence">{ex.sentence.split('＿＿＿＿').map((p, i, a) => (<>{p}{i < a.length - 1 && <span class="blank">＿＿＿＿</span>}</>))}</div>
        )}
        {(ex.kind === 'type' || ex.kind === 'dictation') && (
          <>
            {ex.kind === 'type' ? (
              <div class="prompt">写出符合这个解释的词语：<br /><span>{item.cn}</span>{showEn && <div class="small soft" style={{ fontStyle: 'italic' }}>{item.en}</div>}</div>
            ) : (
              <div class="row"><AudioBtn item={item} large label="再听一次 Play again" /><div class="prompt">听一听，写出你听到的词语。<div class="small soft">Listen and type the word.</div></div></div>
            )}
            <div class="slots" aria-label={`${ex.length} 个字`}>
              {Array.from({ length: ex.length }, (_, i) => <i key={i}>{hintUsed && i === 0 ? ex.hintChar : ''}</i>)}
            </div>
            <div class="type-in">
              <input ref={inputRef} type="text" lang="zh-Hans" autocomplete="off" autocapitalize="off" spellcheck={false} value={typed} disabled={phase !== 'ask'}
                onInput={(e) => { setTyped(e.currentTarget.value); setNote(''); }} onKeyDown={(e) => e.key === 'Enter' && (phase === 'ask' ? submitTyped() : next())} placeholder="输入汉字 Type here" aria-label="你的答案 Your answer" />
              {phase === 'ask' && <button class="btn primary" onClick={submitTyped}>检查 Check</button>}
            </div>
            {phase === 'ask' && (
              <div class="row">
                <button class="btn ghost small" disabled={hintUsed} onClick={() => setHintUsed(true)}>提示 Hint (first character)</button>
                <button class="btn ghost small" onClick={giveUp}>不会 I don't know</button>
              </div>
            )}
            {note && <div class="notice">{note}</div>}
          </>
        )}

        {opts && (
          <div class="opts" role="group" aria-label="选项 Choices">
            {opts.map((o, i) => (
              <button key={i} class={`opt${phase === 'feedback' ? (o.correct ? ' right' : picked === i ? ' wrong' : '') : ''}`} disabled={phase !== 'ask'} onClick={() => choose(i)}>
                <span class="n">{i + 1}</span><span>{o.label}</span>
              </button>
            ))}
          </div>
        )}

        {phase === 'feedback' && result && (
          <div class={`feedback ${result.outcome === 'again' ? 'no' : 'ok'}`} role="status">
            <div class="head">
              <Icon name={result.outcome === 'again' ? 'cross' : 'check'} />
              {result.outcome === 'again' ? '再接再厉 Not quite' : result.outcome === 'hint' ? '答对了（用了提示）Correct, with a hint' : '答对了 Correct'}
            </div>
            {result.outcome === 'again' && typed && <div class="small">你的答案 Your answer: <b>{typed}</b></div>}
            <div class="entry">
              <div class="hw">{item.w} <span class="pinyin" style={{ fontFamily: 'var(--font-body)', fontSize: 15 }}>{item.py}</span> <AudioBtn item={item} /></div>
              <div>{item.cn}</div>
              {showEn && <div class="soft" style={{ fontStyle: 'italic' }}>{item.en}</div>}
              <div class="ex-s"><span><Highlighted text={item.ex} word={item.w} /></span><AudioBtn item={item} part="ex" /></div>
            </div>
            {result.retry && <div class="small soft">这个词稍后会再出现。 You will see this one again shortly.</div>}
          </div>
        )}
      </div>

      <div class="sticky-bottom">
        {ex.kind === 'intro' && <button class="btn primary" onClick={ackIntro}>我记住了 Got it</button>}
        {phase === 'feedback' && <button class="btn primary" onClick={next} autofocus>{lastCard ? '完成 Finish' : '继续 Continue'}</button>}
      </div>
    </div>
  );
}
