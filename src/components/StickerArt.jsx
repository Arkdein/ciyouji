// Hand-drawn sticker art, one emblem per sticker id. Every emblem lives in a 64x64 box and is
// placed on a die-cut round sticker (white edge, flat colour, a little gloss). No fonts, no images.

const SLATE = '#2c4a5e';
const MINT = '#4f9c82';
const MINT_D = '#2f6b57';
const SEAL = '#b0503b';
const GOLD = '#d9a441';
const GOLD_D = '#b8842e';
const CREAM = '#fbf1e4';
const WOOD = '#8b5e3c';
const WOOD_D = '#5c3d26';

function star(cx, cy, R, r, n = 5) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r : R;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(' ');
}

function Flame({ x = 0, y = 0, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M32 6c4 10 15 14 15 29a15 15 0 0 1-30 0c0-8 5-12 8-17 1 4 3 6 6 7-2-7-2-13 1-19z" fill="#ee7d34" />
      <path d="M32 28c3 6 9 8 9 16a9 9 0 0 1-18 0c0-5 4-8 9-16z" fill="#f9c74f" />
    </g>
  );
}

// bg = sticker ground colour. art = the emblem.
const ART = {
  // ---- Stops ------------------------------------------------------------------------------
  s1: { bg: '#cfe8dc', art: (
    <>
      <rect x="20" y="8" width="7" height="50" rx="3.5" fill={MINT} />
      <rect x="36" y="14" width="7" height="44" rx="3.5" fill="#6bbf8f" />
      {[22, 38, 50].map((y) => <rect key={y} x="19" y={y} width="9" height="3" rx="1.5" fill={MINT_D} />)}
      {[28, 42].map((y) => <rect key={y} x="35" y={y} width="9" height="3" rx="1.5" fill={MINT_D} />)}
      <path d="M27 26q12-9 24-3-9 9-24 3z" fill={MINT_D} />
      <path d="M43 36q10-6 18-1-7 7-18 1z" fill={MINT} />
      <path d="M20 40q-10-3-14-11 11 0 14 11z" fill={MINT} />
      <rect x="10" y="57" width="44" height="3" rx="1.5" fill={MINT_D} opacity=".5" />
    </>
  ) },
  s2: { bg: '#f4d9c9', art: (
    <>
      <path d="M32 24c-3-6-10-1-5 4l5 5 5-5c5-5-2-10-5-4z" fill={SEAL} />
      <path d="M5 33h24v5a12 12 0 0 1-24 0z" fill="#fff" stroke={SLATE} stroke-width="2.4" stroke-linejoin="round" />
      <path d="M35 33h24v5a12 12 0 0 1-24 0z" fill="#fff" stroke={SLATE} stroke-width="2.4" stroke-linejoin="round" />
      <ellipse cx="17" cy="33" rx="12" ry="2.6" fill="#c98a4b" stroke={SLATE} stroke-width="2" />
      <ellipse cx="47" cy="33" rx="12" ry="2.6" fill="#c98a4b" stroke={SLATE} stroke-width="2" />
      <path d="M17 24c-3-3 3-5 0-9M47 24c-3-3 3-5 0-9" fill="none" stroke={SLATE} stroke-width="2" stroke-linecap="round" opacity=".55" />
      <path d="M9 55h16M39 55h16" stroke={SLATE} stroke-width="2.4" stroke-linecap="round" />
    </>
  ) },
  s3: { bg: '#cfe0ee', art: (
    <>
      <rect x="6" y="28" width="15" height="28" fill="#e8dcc4" stroke={SLATE} stroke-width="2" />
      <rect x="23" y="12" width="18" height="44" fill="#fff" stroke={SLATE} stroke-width="2" />
      <rect x="43" y="22" width="15" height="34" fill="#e8dcc4" stroke={SLATE} stroke-width="2" />
      {[[9, 32], [15, 32], [9, 40], [15, 40], [9, 48], [15, 48]].map(([x, y], i) => <rect key={`a${i}`} x={x} y={y} width="4" height="4" fill={i === 3 ? '#f2c35b' : '#9cc0da'} />)}
      {[[27, 17], [34, 17], [27, 26], [34, 26], [27, 35], [34, 35], [27, 44], [34, 44]].map(([x, y], i) => <rect key={`b${i}`} x={x} y={y} width="5" height="5" fill={i === 2 || i === 5 ? '#f2c35b' : '#9cc0da'} />)}
      {[[46, 27], [52, 27], [46, 35], [52, 35], [46, 43], [52, 43]].map(([x, y], i) => <rect key={`c${i}`} x={x} y={y} width="4" height="4" fill={i === 1 || i === 4 ? '#f2c35b' : '#9cc0da'} />)}
      <path d="M4 56h56" stroke={SLATE} stroke-width="2.6" stroke-linecap="round" />
      <path d="M32 8c-2.4-4-7 0-3.6 3l3.6 3.4 3.6-3.4c3.4-3-1.2-7-3.6-3z" fill={SEAL} />
    </>
  ) },
  s4: { bg: '#dcd6f0', art: (
    <>
      <path d="M32 18V9" stroke={SLATE} stroke-width="2.6" stroke-linecap="round" />
      <circle cx="32" cy="8" r="3.4" fill={SEAL} />
      <rect x="8" y="28" width="6" height="11" rx="2.5" fill={SLATE} />
      <rect x="50" y="28" width="6" height="11" rx="2.5" fill={SLATE} />
      <rect x="13" y="18" width="38" height="30" rx="9" fill="#fff" stroke={SLATE} stroke-width="2.6" />
      <circle cx="24" cy="32" r="4.6" fill={MINT} />
      <circle cx="40" cy="32" r="4.6" fill={MINT} />
      <circle cx="25.2" cy="30.6" r="1.4" fill="#fff" />
      <circle cx="41.2" cy="30.6" r="1.4" fill="#fff" />
      <path d="M26 41q6 4 12 0" fill="none" stroke={SLATE} stroke-width="2.4" stroke-linecap="round" />
      <rect x="21" y="50" width="22" height="8" rx="3" fill={SLATE} />
      <circle cx="28" cy="54" r="1.4" fill={MINT} /><circle cx="36" cy="54" r="1.4" fill={GOLD} />
    </>
  ) },
  s5: { bg: '#d6ecd0', art: (
    <>
      <circle cx="49" cy="14" r="6.5" fill="#f2c35b" />
      <path d="M12 56q20-16 40 0z" fill={WOOD} />
      <path d="M32 54V32" stroke={MINT_D} stroke-width="3.2" stroke-linecap="round" />
      <path d="M32 40Q14 38 12 22q18 0 20 18z" fill="#6bbf8f" />
      <path d="M32 33q15 0 20-15-16-3-20 15z" fill={MINT} />
      <path d="M32 40Q22 36 17 27" fill="none" stroke="#e7f6ea" stroke-width="1.4" stroke-linecap="round" opacity=".7" />
    </>
  ) },
  s6: { bg: '#f6e3c4', art: (
    <>
      <path d="M32 3v6" stroke={GOLD_D} stroke-width="2.4" stroke-linecap="round" />
      <rect x="23" y="9" width="18" height="5" rx="2" fill={GOLD} />
      <ellipse cx="32" cy="31" rx="19" ry="17" fill={SEAL} />
      <path d="M32 14c-9 10-9 24 0 34M32 14c9 10 9 24 0 34M14 31h36" fill="none" stroke="#8e3b2a" stroke-width="1.6" />
      <rect x="23" y="48" width="18" height="5" rx="2" fill={GOLD} />
      <path d="M32 53v6M28 58h8M26 58l-1 4M38 58l1 4" stroke={GOLD_D} stroke-width="2.2" stroke-linecap="round" />
      <path d="M20 24q3-6 9-8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45" />
    </>
  ) },
  s7: { bg: '#e0e8f1', art: (
    <>
      <circle cx="32" cy="10" r="3.4" fill={GOLD_D} />
      <rect x="30" y="11" width="4" height="38" fill={SLATE} />
      <rect x="20" y="49" width="24" height="6" rx="2.5" fill={SLATE} />
      <rect x="8" y="15" width="48" height="3.4" rx="1.7" fill={SLATE} />
      <path d="M11 18L4 34M11 18l7 16M53 18l-7 16M53 18l7 16" stroke={SLATE} stroke-width="1.6" fill="none" />
      <path d="M2 34h18a9 6 0 0 1-18 0z" fill={GOLD} stroke={GOLD_D} stroke-width="1.6" stroke-linejoin="round" />
      <path d="M44 34h18a9 6 0 0 1-18 0z" fill={GOLD} stroke={GOLD_D} stroke-width="1.6" stroke-linejoin="round" />
    </>
  ) },
  s8: { bg: '#f1dfc4', art: (
    <>
      <path d="M23 24v-6a3.4 3.4 0 0 1 3.4-3.4h11.2A3.4 3.4 0 0 1 41 18v6" fill="none" stroke={WOOD_D} stroke-width="3.4" stroke-linecap="round" />
      <rect x="8" y="23" width="48" height="31" rx="5" fill={WOOD} />
      <path d="M8 36h48" stroke={WOOD_D} stroke-width="3.2" />
      <rect x="27" y="32" width="10" height="11" rx="2" fill={GOLD} stroke={GOLD_D} stroke-width="1.6" />
      <circle cx="32" cy="37" r="1.6" fill={WOOD_D} />
      <path d="M13 28h10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".3" />
    </>
  ) },
  s9: { bg: '#f6dccb', art: (
    <>
      <rect x="9" y="46" width="42" height="9" rx="2.4" fill={SLATE} />
      <rect x="13" y="37" width="38" height="9" rx="2.4" fill={MINT} />
      <rect x="8" y="28" width="38" height="9" rx="2.4" fill={SEAL} />
      <path d="M13 50.5h30M17 41.5h30M12 32.5h30" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6" />
      <path d="M22 18v6q10 5 20 0v-6" fill="#3d6178" />
      <path d="M32 5L54 14 32 23 10 14z" fill={SLATE} />
      <path d="M54 14v13" stroke={GOLD} stroke-width="2.2" stroke-linecap="round" /><circle cx="54" cy="29" r="2.4" fill={GOLD} />
    </>
  ) },
  idiom: { bg: '#f4e6c6', art: (
    <>
      <rect x="14" y="14" width="36" height="36" fill="#fffaf0" stroke={GOLD_D} stroke-width="1.8" />
      <rect x="9" y="9" width="46" height="8" rx="4" fill={GOLD_D} />
      <rect x="9" y="47" width="46" height="8" rx="4" fill={GOLD_D} />
      <circle cx="9" cy="13" r="2" fill="#f4d58a" /><circle cx="55" cy="13" r="2" fill="#f4d58a" />
      <path d="M22 21v18M30 21v14M38 21v18" stroke={SLATE} stroke-width="2.6" stroke-linecap="round" stroke-dasharray="5 3" />
      <rect x="41" y="35" width="7" height="7" rx="1.2" fill={SEAL} />
    </>
  ) },

  // ---- Habits -----------------------------------------------------------------------------
  first: { bg: '#d6ece5', art: (
    <>
      <g transform="rotate(-12 22 40)"><ellipse cx="22" cy="42" rx="8" ry="11" fill={MINT} /><ellipse cx="22" cy="58" rx="6.4" ry="4.4" fill={MINT} />
        {[[16, 28], [20.5, 26], [25, 26.4], [29, 28.6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill={MINT} />)}</g>
      <g transform="rotate(12 42 24)"><ellipse cx="42" cy="26" rx="8" ry="11" fill={MINT_D} /><ellipse cx="42" cy="42" rx="6.4" ry="4.4" fill={MINT_D} />
        {[[36, 12], [40.5, 10], [45, 10.4], [49, 12.6]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2" fill={MINT_D} />)}</g>
    </>
  ) },
  streak3: { bg: '#fbe9bd', art: (
    <>
      <Flame x={14} y={14} s={0.56} />
      <polygon points={star(12, 18, 6, 2.2, 4)} fill={GOLD} />
      <polygon points={star(52, 14, 5, 1.9, 4)} fill={GOLD} />
      <polygon points={star(50, 46, 6.5, 2.4, 4)} fill={GOLD} />
      <path d="M18 56h28" stroke={WOOD} stroke-width="3.4" stroke-linecap="round" />
    </>
  ) },
  streak7: { bg: '#fcdcb4', art: (
    <>
      <Flame x={2} y={0} s={0.94} />
      <path d="M12 58l40-8M12 50l40 8" stroke={WOOD} stroke-width="4" stroke-linecap="round" />
    </>
  ) },
  streak30: { bg: '#f7cdb8', art: (
    <>
      <polygon points={star(10, 14, 5, 2, 4)} fill={GOLD} />
      <polygon points={star(55, 10, 4.4, 1.8, 4)} fill={GOLD} />
      <polygon points={star(56, 34, 3.6, 1.5, 4)} fill={GOLD} />
      <Flame x={-3} y={-8} s={1.1} />
      <path d="M12 60l40-12M12 48l40 12" stroke={WOOD} stroke-width="4.6" stroke-linecap="round" />
      <path d="M5 60q8-2 14 0M45 60q8-2 14 0" stroke={WOOD_D} stroke-width="2.4" stroke-linecap="round" />
    </>
  ) },
  perfect: { bg: '#fde8ae', art: (
    <>
      <polygon points={star(32, 33, 26, 11)} fill={GOLD} stroke={GOLD_D} stroke-width="2.4" stroke-linejoin="round" />
      <polygon points={star(32, 33, 14, 6)} fill="#f6d77f" />
      <path d="M10 10l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM54 48l1.6 3.2 3.2 1.6-3.2 1.6L54 58l-1.6-3.6-3.2-1.6 3.2-1.6z" fill="#fff" opacity=".9" />
    </>
  ) },
  comeback: { bg: '#cfe5f2', art: (
    <>
      <path d="M32 8v38" stroke={SLATE} stroke-width="2.6" stroke-linecap="round" />
      <path d="M32 11v31H13z" fill="#fff" stroke={SLATE} stroke-width="2.2" stroke-linejoin="round" />
      <path d="M35 17v25h17z" fill={CREAM} stroke={SLATE} stroke-width="2.2" stroke-linejoin="round" />
      <path d="M32 8h9l-3 3 3 3h-9z" fill={SEAL} />
      <path d="M10 44h44l-7 10H17z" fill={SEAL} />
      <path d="M3 56q6-5 12 0t12 0 12 0 12 0 8-3" fill="none" stroke="#4f7fa8" stroke-width="3" stroke-linecap="round" />
    </>
  ) },
  exam100: { bg: '#f7d9d2', art: <CalendarArt text="100" /> },
  exam30: { bg: '#f4d3bd', art: <CalendarArt text="30" /> },

  // ---- Word milestones --------------------------------------------------------------------
  words50: { bg: '#d6e7f1', art: (
    <g transform="rotate(35 32 32)">
      <circle cx="16" cy="32" r="11" fill="none" stroke={GOLD} stroke-width="6" />
      <rect x="25" y="29" width="32" height="6.4" rx="3.2" fill={GOLD} />
      <rect x="44" y="34" width="5.6" height="10" rx="1.6" fill={GOLD} />
      <rect x="53" y="34" width="5" height="7" rx="1.6" fill={GOLD} />
      <circle cx="12" cy="27" r="2" fill="#fff" opacity=".6" />
    </g>
  ) },
  words150: { bg: '#dcefdf', art: (
    <>
      <defs><clipPath id="sk-gate"><circle cx="32" cy="38" r="13" /></clipPath></defs>
      <path d="M3 17q29-14 58 0l-5 6H8z" fill={SLATE} />
      <rect x="8" y="22" width="48" height="34" fill="#fff" stroke={SLATE} stroke-width="2" />
      <circle cx="32" cy="38" r="13" fill="#b9e3cf" />
      <g clip-path="url(#sk-gate)"><path d="M16 52q9-14 17-4 6-9 16 4v6H16z" fill={MINT} /><circle cx="39" cy="31" r="3.2" fill="#f2c35b" /></g>
      <circle cx="32" cy="38" r="13" fill="none" stroke={SLATE} stroke-width="2.6" />
    </>
  ) },
  words400: { bg: '#f4e2bd', art: (
    <>
      <rect x="9" y="30" width="46" height="24" rx="3" fill={WOOD} />
      <path d="M9 30a23 17 0 0 1 46 0z" fill="#a8744b" />
      <path d="M18 14v40M46 14v40" stroke={WOOD_D} stroke-width="3.2" opacity=".7" />
      <rect x="9" y="36" width="46" height="3.4" fill={WOOD_D} opacity=".7" />
      <rect x="27" y="33" width="10" height="12" rx="2" fill={GOLD} stroke={GOLD_D} stroke-width="1.6" />
      <circle cx="32" cy="38" r="1.8" fill={WOOD_D} />
      <polygon points={star(12, 12, 6, 2.2, 4)} fill={GOLD} /><polygon points={star(53, 9, 5, 1.9, 4)} fill={GOLD} /><polygon points={star(32, 8, 4, 1.6, 4)} fill="#fff" />
    </>
  ) },
  journey: { bg: '#cfe0f0', art: (
    <>
      <path d="M2 56L24 20l10 16 8-10 20 30z" fill="#4f7fa8" />
      <path d="M24 20l-6 10 4-2 3 4 3-4 3 2z" fill="#fff" />
      <path d="M42 26l-5 8 3-1.4 2 2.6 3-3z" fill="#e7f0f8" />
      <path d="M24 20V6" stroke={SLATE} stroke-width="2.4" stroke-linecap="round" />
      <path d="M24 6h13l-3.6 4.4L37 15H24z" fill={SEAL} />
      <path d="M6 58q10-6 22-4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1 5" />
    </>
  ) },

  // ---- Writing ----------------------------------------------------------------------------
  write1: { bg: '#e8e3d6', art: (
    <>
      <g transform="rotate(38 32 26)">
        <rect x="28.4" y="2" width="7.2" height="30" rx="3.6" fill={WOOD} />
        <rect x="27.4" y="30" width="9.2" height="6" rx="1.4" fill={GOLD} />
        <path d="M27.6 36h8.8l-2 15q-2.4 5-4.8 0z" fill={SLATE} />
      </g>
      <path d="M8 56q10-8 26-3" fill="none" stroke={SLATE} stroke-width="4.4" stroke-linecap="round" />
    </>
  ) },
  write20: { bg: '#dcd7e8', art: (
    <>
      <rect x="6" y="34" width="52" height="20" rx="6" fill="#3a3f4a" />
      <ellipse cx="30" cy="38" rx="19" ry="6.4" fill="#12151a" />
      <path d="M17 36q10-3 22-1" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".35" />
      <g transform="rotate(28 44 22)"><rect x="39" y="6" width="9" height="28" rx="2" fill="#1f2430" /><rect x="39" y="10" width="9" height="4" fill={GOLD} /></g>
      <rect x="9" y="50" width="46" height="2.4" rx="1.2" fill="#5a6070" />
    </>
  ) },
  write50: { bg: '#f7dcd5', art: (
    <>
      <rect x="9" y="9" width="46" height="46" fill="#fff" stroke={SEAL} stroke-width="2.4" />
      <path d="M32 9v46M9 32h46M9 9l46 46M55 9L9 55" stroke={SEAL} stroke-width="1.2" stroke-dasharray="3 3" opacity=".55" fill="none" />
      <path d="M19 34l9 9 17-21" fill="none" stroke={MINT} stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round" />
    </>
  ) },
  writeday: { bg: '#f5e8b4', art: (
    <>
      <path d="M22 40l-7 20 9-5 5 7 5-22z" fill={SEAL} />
      <path d="M42 40l7 20-9-5-5 7-5-22z" fill="#8e3b2a" />
      <circle cx="32" cy="28" r="20" fill={GOLD} stroke={GOLD_D} stroke-width="3" />
      <circle cx="32" cy="28" r="14.5" fill="none" stroke="#f6d77f" stroke-width="2" />
      <path d="M18 29.5q14-5 28-1" fill="none" stroke={SEAL} stroke-width="5.2" stroke-linecap="round" />
    </>
  ) },
  writejade: { bg: '#d3ecdf', art: (
    <>
      <circle cx="32" cy="28" r="22" fill="#7fcfa6" stroke={MINT_D} stroke-width="2.4" />
      <circle cx="32" cy="28" r="7.5" fill="#d3ecdf" stroke={MINT_D} stroke-width="2.4" />
      <circle cx="32" cy="28" r="15.5" fill="none" stroke="#b9ecd0" stroke-width="1.6" stroke-dasharray="1.2 4.4" stroke-linecap="round" />
      <path d="M18 18q5-7 13-8" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".6" />
      <path d="M32 50v5" stroke={SEAL} stroke-width="2.2" />
      <circle cx="32" cy="57" r="3" fill={SEAL} />
      <path d="M28 59l-2 4M36 59l2 4M32 60v4" stroke={SEAL} stroke-width="1.8" stroke-linecap="round" />
    </>
  ) },
};

function CalendarArt({ text }) {
  return (
    <>
      <rect x="8" y="13" width="48" height="43" rx="6" fill="#fff" stroke={SLATE} stroke-width="2.6" />
      <path d="M8 19a6 6 0 0 1 6-6h36a6 6 0 0 1 6 6v8H8z" fill={SEAL} />
      <rect x="19" y="8" width="4" height="10" rx="2" fill={SLATE} />
      <rect x="41" y="8" width="4" height="10" rx="2" fill={SLATE} />
      <text x="32" y="48" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size={text.length > 2 ? 19 : 24} fill={SLATE}>{text}</text>
    </>
  );
}

export const STICKER_IDS = Object.keys(ART);

export function StickerArt({ id, size = 96, locked = false, class: cls = '' }) {
  const a = ART[id] || ART.first;
  return (
    <svg class={`sticker-art${locked ? ' locked' : ''} ${cls}`} width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <circle cx="48" cy="48" r="45" fill="#ffffff" />
      <circle cx="48" cy="48" r="39.5" fill={locked ? '#dfe5e6' : a.bg} />
      <g transform="translate(48 49) scale(.9) translate(-32 -32)" class="emblem">{a.art}</g>
      <path d="M17 36A33 33 0 0 1 40 14" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity={locked ? 0 : 0.42} />
    </svg>
  );
}
