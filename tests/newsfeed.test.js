import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseFeed, safeUrl, isoDate, groupByWeek } from '../src/lib/newsfeed.js';

const HEAD = 'week,strand,title,source,published,url,hook_cn,hook_en';

test('csv: quoted commas, doubled quotes, CRLF, blank lines', () => {
  const r = parseCsv('a,b\r\n"x, y","say ""hi"""\r\n\r\n');
  assert.deepEqual(r, [['a', 'b'], ['x, y', 'say "hi"']]);
});

test('urls: https only, allow-listed hosts only', () => {
  assert.ok(safeUrl('https://www.zaobao.com.sg/news/singapore/story2026'));
  assert.ok(safeUrl('https://www.8world.com/x'));
  assert.equal(safeUrl('http://www.zaobao.com.sg/x'), null);
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://zaobao.com.sg.evil.example/x'), null);
  assert.equal(safeUrl('https://evil.example/https://zaobao.com.sg/'), null);
  assert.equal(safeUrl('not a url'), null);
});

test('dates: ISO kept, US-style converted', () => {
  assert.equal(isoDate('2026-10-27'), '2026-10-27');
  assert.equal(isoDate('10/27/2026'), '2026-10-27');
  assert.equal(isoDate('27/10/2026'), '2026-10-27');
  assert.equal(isoDate('soon'), null);
});

test('feed: bad rows dropped, newest first, fields trimmed', () => {
  const csv = [
    HEAD,
    '2026-10-26,s1,"少年创业，不怕失败",联合早报,2026-10-24,https://www.zaobao.com.sg/a,"一句话, 很好",A line',
    '2026-10-26,s9,旧闻,联合早报,2026-10-10,https://www.zaobao.com.sg/b,,',
    '2026-10-26,s2,坏链接,联合早报,2026-10-25,http://www.zaobao.com.sg/c,,',
    '2026-10-26,zz,坏主题,联合早报,2026-10-25,https://www.zaobao.com.sg/d,,',
    '2026-10-26,s3,,联合早报,2026-10-25,https://www.zaobao.com.sg/e,,',
    '2026-10-26,s4,境外网站,X,2026-10-25,https://example.com/f,,',
  ].join('\n');
  const f = parseFeed(csv);
  assert.deepEqual(f.map((x) => x.url), ['https://www.zaobao.com.sg/a', 'https://www.zaobao.com.sg/b']);
  assert.equal(f[0].hookCn, '一句话, 很好');
});

test('feed: empty or wrong header yields nothing', () => {
  assert.deepEqual(parseFeed(''), []);
  assert.deepEqual(parseFeed('a,b\n1,2'), []);
});

test('feed: only the most recent 8 weeks are kept; grouping is newest first', () => {
  const rows = [HEAD];
  for (let w = 1; w <= 10; w++) {
    const wk = `2026-0${w < 10 ? w : 9}-${w < 10 ? '01' : '15'}`; // 10 distinct week keys
    rows.push(`${wk},s1,t${w},联合早报,${wk},https://www.zaobao.com.sg/p${w},,`);
  }
  const f = parseFeed(rows.join('\n'));
  assert.equal(new Set(f.map((x) => x.week)).size, 8);
  const g = groupByWeek(f);
  assert.ok(g[0].week > g[g.length - 1].week);
});
