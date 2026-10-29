import { useEffect, useRef } from 'preact/hooks';
import { RANKS, rankInfo } from '../lib/game.js';
import { STICKER_BY_ID } from '../lib/stickers.js';
import { XP } from '../lib/game.js';
import { StickerArt } from './StickerArt.jsx';

// Rank medallions grow from a plain slate seal to a gold-ringed vermilion one.
const TIER = ['#6f8796', '#2c4a5e', '#3b7c67', '#2f6b57', '#a97a22', '#8a5f14', '#b0503b'];

export function RankBadge({ index, size = 48 }) {
  const r = RANKS[index] || RANKS[0];
  const high = index >= 4;
  return (
    <svg class="rank-badge" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${r.cn} ${r.en}`}>
      {high && <rect x="1.5" y="1.5" width="61" height="61" rx="17" fill="none" stroke="#d9a441" stroke-width="3" />}
      <rect x="6" y="6" width="52" height="52" rx="13" fill={TIER[index] || TIER[0]} />
      <rect x="10.5" y="10.5" width="43" height="43" rx="9" fill="none" stroke="#fbf1e4" stroke-width="1.6" opacity=".6" />
      <text x="32" y="43.5" text-anchor="middle" font-family="'ZCOOL XiaoWei','STKaiti','KaiTi','Noto Serif CJK SC',serif" font-size="30" fill="#fbf1e4">{r.ch}</text>
      {index === 6 && <path d="M32 3l2 4 4 .6-3 3 .8 4.2L32 12.6 28.2 15l.8-4.2-3-3 4-.6z" fill="#d9a441" />}
    </svg>
  );
}

/** XP bar toward the next rank. */
export function RankMeter({ xp, compact = false }) {
  const info = rankInfo(xp);
  return (
    <div class={`rank-meter${compact ? ' compact' : ''}`}>
      <div class="rm-top">
        <b class="rm-name">{info.rank.cn}</b>
        <span class="rm-en">{info.rank.en}</span>
        <span class="rm-xp tnum">{xp} XP</span>
      </div>
      <div class="rm-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={info.pct} aria-label="升级进度 Progress to next rank"><i style={{ width: `${info.pct}%` }} /></div>
      {!compact && (
        <div class="rm-foot small soft">
          {info.next ? `再得 ${info.left} XP 升为「${info.next.cn}」 · ${info.left} XP to ${info.next.en}` : '已达最高级 · Top rank reached'}
        </div>
      )}
    </div>
  );
}

/** Full-screen pop-up for the front of the celebration queue: a new sticker or a new rank. */
export function Celebration({ item, onClose }) {
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
    const f = (e) => (e.key === 'Escape' || e.key === 'Enter') && onClose();
    addEventListener('keydown', f);
    return () => removeEventListener('keydown', f);
  }, [item]);
  const [kind, id] = item.split(':');
  const sticker = kind === 'sticker' ? STICKER_BY_ID[id] : null;
  const rank = kind === 'rank' ? RANKS[+id] : null;
  if (!sticker && !rank) return null;
  return (
    <div class="cele" role="dialog" aria-modal="true" aria-label={sticker ? '获得新贴纸 New sticker' : '升级 Rank up'}>
      <div class="cele-card">
        <div class="cele-glow" aria-hidden="true" />
        {sticker ? (
          <>
            <div class="small cele-kicker">新贴纸 New sticker</div>
            <div class="cele-art"><StickerArt id={sticker.id} size={176} /></div>
            <h2>{sticker.cn}</h2>
            <div class="soft">{sticker.en}</div>
            <p class="small soft cele-how">{sticker.how.cn}<br />{sticker.how.en}</p>
            <div class="cele-xp">+{XP.sticker} XP</div>
          </>
        ) : (
          <>
            <div class="small cele-kicker">升级 Rank up</div>
            <div class="cele-art"><RankBadge index={+id} size={132} /></div>
            <h2>{rank.cn}</h2>
            <div class="soft">{rank.en}</div>
            <p class="small soft cele-how">路越走越远了。 You are going further down the road.</p>
          </>
        )}
        <button ref={btn} class="btn primary" onClick={onClose}>{sticker ? '收进贴纸册 Keep it' : '继续 Continue'}</button>
      </div>
    </div>
  );
}
