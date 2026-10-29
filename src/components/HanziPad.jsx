import { useEffect, useRef, useState } from 'preact/hooks';
import { charDataLoader } from '../lib/strokes.js';

// hanzi-writer is loaded on demand so students who never open the writing screen never download it.
let libPromise;
const loadLib = () => (libPromise ||= import('hanzi-writer').then((m) => m.default || m));
const css = (name, fallback) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/**
 * A square writing pad on a 米字格 grid.
 *   mode 'watch' – animate the stroke order
 *   mode 'trace' – faint outline, student traces each stroke (checked for order and direction)
 *   mode 'quiz'  – no outline, student writes from memory
 * onComplete({ mistakes }) fires when the last stroke is done (or the animation ends).
 * Change `runKey` to restart the same mode.
 */
export function HanziPad({ char, mode, runKey = 0, onComplete, onMistake, onStroke, onError }) {
  const box = useRef(null);
  const cb = useRef({});
  cb.current = { onComplete, onMistake, onStroke, onError };
  const [size] = useState(() => Math.max(220, Math.min(340, (window.innerWidth || 360) - 56)));

  useEffect(() => {
    let dead = false;
    let writer = null;
    const el = box.current;
    el.innerHTML = '';
    loadLib().then((HanziWriter) => {
      if (dead) return;
      writer = HanziWriter.create(el, char, {
        width: size,
        height: size,
        padding: 14,
        showOutline: mode !== 'quiz',
        showCharacter: false,
        strokeColor: css('--ink-strong', '#1d3444'),
        outlineColor: css('--line-strong', '#bfc9cb'),
        highlightColor: css('--mint-strong', '#3b7c67'),
        drawingColor: css('--text', '#23303a'),
        drawingWidth: 7,
        strokeAnimationSpeed: 1.1,
        delayBetweenStrokes: 260,
        // Forgiving on a phone: fingers are blunt, so accept wobblier strokes and give up gracefully.
        leniency: 1.5,
        showHintAfterMisses: 2,
        markStrokeCorrectAfterMisses: 3,
        highlightOnComplete: true,
        charDataLoader,
        onLoadCharDataError: () => !dead && cb.current.onError?.(),
      });
      if (mode === 'watch') {
        writer.animateCharacter({ onComplete: () => !dead && cb.current.onComplete?.({ mistakes: 0 }) });
      } else {
        writer.quiz({
          onMistake: (d) => !dead && cb.current.onMistake?.(d),
          onCorrectStroke: (d) => !dead && cb.current.onStroke?.(d),
          onComplete: (s) => !dead && cb.current.onComplete?.({ mistakes: s.totalMistakes }),
        });
      }
    });
    return () => {
      dead = true;
      try { writer?.cancelQuiz(); } catch { /* not in a quiz */ }
      el.innerHTML = '';
    };
  }, [char, mode, runKey]);

  return <div class="pad" ref={box} style={{ width: size, height: size }} role="img" aria-label={`书写区 Writing area: ${char}`} />;
}
