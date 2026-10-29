// Weekly news picks: a teacher-approved list of links, published from a Google Sheet as CSV.
// Pure parsing/validation lives here (testable); fetching and caching are at the bottom.
import { dayFromIso } from './dates.js';

const STRAND_IDS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 'idiom'];
// Only links to these sites are ever shown, even if the sheet is edited by mistake.
export const ALLOWED_HOSTS = ['zaobao.com.sg', 'zaobao.com', '8world.com', 'cna.com.sg', 'channelnewsasia.com', 'straitstimes.com'];
const CACHE_KEY = 'h1vs:newsfeed';
const KEEP_WEEKS = 8;

/** Minimal RFC-4180 CSV parser (quoted fields, doubled quotes, CRLF). */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else q = false;
      } else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cur); cur = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x !== '')) rows.push(row);
  return rows;
}

export function safeUrl(u) {
  try {
    const url = new URL(String(u).trim());
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Accept 2026-10-27, or a date Sheets reformatted (e.g. 10/27/2026). Returns ISO or null. */
export function isoDate(s) {
  const t = String(s || '').trim();
  if (dayFromIso(t) != null) return t;
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const [a, b, y] = [+m[1], +m[2], +m[3]];
    const [mo, d] = a > 12 ? [b, a] : [a, b]; // US order unless obviously day-first
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  return null;
}

const clip = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** CSV text → clean list of picks, newest first. Bad rows are dropped, never shown. */
export function parseFeed(csv) {
  const rows = parseCsv(csv);
  if (rows.length < 2) return [];
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const idx = Object.fromEntries(['week', 'strand', 'title', 'source', 'published', 'url', 'hook_cn', 'hook_en'].map((k) => [k, col(k)]));
  if (idx.title < 0 || idx.url < 0 || idx.strand < 0) return [];
  const out = [];
  for (const r of rows.slice(1)) {
    const get = (k) => (idx[k] >= 0 ? r[idx[k]] || '' : '');
    const url = safeUrl(get('url'));
    const strand = get('strand').trim().toLowerCase();
    const title = clip(get('title'), 120);
    if (!url || !title || !STRAND_IDS.includes(strand)) continue;
    out.push({
      week: isoDate(get('week')) || '',
      strand,
      title,
      source: clip(get('source'), 30),
      published: isoDate(get('published')) || '',
      url,
      hookCn: clip(get('hook_cn'), 200),
      hookEn: clip(get('hook_en'), 240),
    });
  }
  out.sort((a, b) => (b.published || b.week).localeCompare(a.published || a.week));
  const weeks = [...new Set(out.map((x) => x.week).filter(Boolean))].sort().reverse().slice(0, KEEP_WEEKS);
  return out.filter((x) => !x.week || weeks.includes(x.week));
}

/** Group by week, newest week first. */
export function groupByWeek(items) {
  const m = new Map();
  for (const it of items) {
    const k = it.week || it.published.slice(0, 10) || '—';
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(it);
  }
  return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([week, list]) => ({ week, list }));
}

/** Fetch the published sheet; fall back to the last copy this device saved. */
export async function loadFeed(url) {
  if (!url) return { state: 'unconfigured', items: [] };
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error(String(r.status));
    const items = parseFeed(await r.text());
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), items })); } catch { /* storage full or blocked */ }
    return { state: 'live', items, t: Date.now() };
  } catch {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (c && Array.isArray(c.items)) return { state: 'cache', items: c.items.filter((x) => safeUrl(x.url)), t: c.t };
    } catch { /* ignore */ }
    return { state: 'error', items: [] };
  }
}
