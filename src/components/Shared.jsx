import { Icon } from './Icon.jsx';
import { play } from '../lib/audio.js';
import { useAudioReady } from '../lib/audio.js';

export function Tianzige({ ch, big }) {
  return (
    <div class={`tzg${big ? ' big' : ''}`} aria-hidden="true">
      <span>{ch}</span>
    </div>
  );
}

/** part: 'w' for the headword, 'ex' for the example sentence */
export function AudioBtn({ item, part = 'w', large, label }) {
  const ready = useAudioReady();
  if (!ready) return null;
  return (
    <button type="button" class={`audio-btn${large ? ' lg' : ''}`} onClick={(e) => { e.stopPropagation(); play(item, part); }} aria-label={label || (part === 'w' ? `朗读 ${item.w}` : '朗读例句')}>
      <Icon name="speaker" />
    </button>
  );
}

/** Stacked status bar. counts: {secure, reviewing, learning, total} */
export function MasteryBar({ counts }) {
  const pct = (n) => `${(100 * n) / Math.max(1, counts.total)}%`;
  return (
    <div class="mbar" role="img" aria-label={`${counts.secure} 已掌握, ${counts.reviewing} 复习中, ${counts.learning} 学习中, 共 ${counts.total}`}>
      <i class="secure" style={{ width: pct(counts.secure) }} />
      <i class="reviewing" style={{ width: pct(counts.reviewing) }} />
      <i class="learning" style={{ width: pct(counts.learning) }} />
    </div>
  );
}

export function Legend() {
  return (
    <div class="legend">
      <span><i class="dot secure" /> 已掌握 Secure</span>
      <span><i class="dot reviewing" /> 复习中 Reviewing</span>
      <span><i class="dot learning" /> 学习中 Learning</span>
      <span><i class="dot" /> 未学 New</span>
    </div>
  );
}

/** Highlight the target word inside its example sentence. */
export function Highlighted({ text, word }) {
  const parts = text.split(word);
  return (
    <>
      {parts.map((p, i) => (
        <>
          {p}
          {i < parts.length - 1 ? <mark>{word}</mark> : null}
        </>
      ))}
    </>
  );
}
