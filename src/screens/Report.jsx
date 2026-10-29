import { useState } from 'preact/hooks';
import { useStore, update } from '../lib/store.js';
import { useToday, useConfig, go } from '../lib/hooks.js';
import { VOCAB, STRANDS } from '../lib/vocab.js';
import { summarise, progressCode, submitToForm } from '../lib/report.js';
import { Icon } from '../components/Icon.jsx';
import { MasteryBar } from '../components/Shared.jsx';
import { STICKERS } from '../lib/stickers.js';

export function Report() {
  const st = useStore();
  const today = useToday();
  const config = useConfig();
  const [msg, setMsg] = useState('');
  const sum = summarise(st, VOCAB, STRANDS, today);
  const code = progressCode(sum);
  const canSend = !!(config && config.formResponseUrl);
  const missingId = !st.profile.name.trim() || !st.profile.cls.trim() || !st.profile.idx.trim();

  const send = async () => {
    if (missingId) return setMsg('请先在「进度」页填写姓名、班级和学号。 Add your name, class and index number under Progress first.');
    try {
      await submitToForm(sum, config);
      update((s) => ({ ...s, sent: new Date().toISOString() }));
      setMsg('已发送。如果老师没有收到，请保存 PDF 或复制下面的进度代码给老师。 Sent. If your teacher does not see it, save the PDF or send the progress code below.');
    } catch {
      setMsg('发送失败（可能没有网络）。请保存 PDF 或复制进度代码。 Could not send (you may be offline). Save the PDF or copy the progress code instead.');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setMsg('已复制进度代码。 Progress code copied.');
    } catch {
      setMsg('无法自动复制，请长按下方代码手动复制。 Could not copy automatically; select the code below and copy it.');
    }
  };

  return (
    <div class="report">
      <div class="page-head no-print">
        <a href="#/progress/settings" class="small">← 返回 Back</a>
      </div>
      <div class="page-head">
        <h1>词游记　学习进度报告</h1>
        <div class="en">Progress report · {sum.date}</div>
      </div>

      <div class="no-print row" style={{ marginBottom: 14 }}>
        <button class="btn primary" onClick={() => window.print()}><Icon name="print" /> 打印 / 存为PDF Print or save as PDF</button>
        <button class="btn ghost" disabled={!canSend} onClick={send}><Icon name="send" /> 发送给老师 Send to teacher</button>
        <button class="btn ghost" onClick={copy}>复制进度代码 Copy code</button>
      </div>
      {!canSend && config && <div class="notice no-print" style={{ marginBottom: 12 }}>老师还没有开通在线提交。请用「打印 / 存为PDF」，并把 PDF 交给老师。 Online submission is not switched on yet. Use Print / Save as PDF and hand the file to your teacher.</div>}
      {msg && <div class="notice no-print" style={{ marginBottom: 12 }} role="status">{msg}</div>}

      <div class="card">
        <table>
          <tbody>
            <tr><th>姓名 Name</th><td colSpan={3}><b>{sum.name || '—'}</b></td></tr>
            <tr><th>班级 Class</th><td>{sum.cls || '—'}</td><th>学号 Index</th><td>{sum.idx || '—'}</td></tr>
            <tr><th>日期 Date</th><td colSpan={3}>{sum.date}</td></tr>
            {sum.examDays != null && <tr><th>距离考试 To exam</th><td colSpan={3}>{sum.examDays} 天 days</td></tr>}
          </tbody>
        </table>
        <div class="meta">
          <div><b class="tnum">{sum.streak}</b><span>连续天数 Streak</span></div>
          <div><b class="tnum">{sum.daysWeek}</b><span>本周学习天数 Days this week</span></div>
          <div><b class="tnum">{sum.daysTotal}</b><span>累计学习天数 Study days</span></div>
          <div><b class="tnum">{sum.acc7 == null ? '—' : `${sum.acc7}%`}</b><span>近7天正确率 7-day accuracy ({sum.answered7})</span></div>
        </div>
        <div class="meta">
          <div><b class="tnum">{sum.secure}</b><span>已掌握 Secure</span></div>
          <div><b class="tnum">{sum.reviewing}</b><span>复习中 Reviewing</span></div>
          <div><b class="tnum">{sum.learning}</b><span>学习中 Learning</span></div>
          <div><b class="tnum">{sum.unseen}</b><span>未学 Not started (of {sum.total})</span></div>
        </div>
      </div>

      <div class="card">
        <h2>各主题掌握情况</h2>
        <div class="small soft" style={{ marginBottom: 8 }}>Mastery by list</div>
        <table>
          <thead><tr><th>主题 List</th><th class="num">掌握</th><th class="num">复习</th><th class="num">学习</th><th class="num">未学</th><th style={{ width: '22%' }}></th></tr></thead>
          <tbody>
            {sum.lists.map((l) => (
              <tr key={l.id}>
                <td>{l.id === 'idiom' ? '成语库' : `${l.num}. ${l.cn}`}</td>
                <td class="num">{l.secure}</td><td class="num">{l.reviewing}</td><td class="num">{l.learning}</td><td class="num">{l.new}</td>
                <td><MasteryBar counts={l} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>最需要复习的词语</h2>
        <div class="small soft" style={{ marginBottom: 6 }}>Words to revisit</div>
        <div style={{ fontSize: 18 }}>{sum.weak.length ? sum.weak.join('　') : '暂时没有 None yet'}</div>
      </div>

      <div class="card">
        <h2>书写练习</h2>
        <div class="small soft" style={{ marginBottom: 8 }}>Handwriting (stroke-checked, from memory)</div>
        <div class="meta">
          <div><b class="tnum">{sum.write.started}</b><span>已开始的字 Characters started</span></div>
          <div><b class="tnum">{sum.write.secure}</b><span>已掌握 Secure</span></div>
          <div><b class="tnum">{sum.write.acc7 == null ? '—' : `${sum.write.acc7}%`}</b><span>近7天写对率 7-day accuracy ({sum.write.attempts7})</span></div>
        </div>
        <div class="small soft" style={{ margin: '10px 0 4px' }}>最常写错的字 Most-missed characters</div>
        <div style={{ fontSize: 22 }}>{sum.write.weak.length ? sum.write.weak.join('　') : '暂时没有 None yet'}</div>
      </div>

      <div class="card">
        <h2>旅程积分</h2>
        <div class="small soft" style={{ marginBottom: 8 }}>Journey points (engagement only, not for marks)</div>
        <div class="meta">
          <div><b class="tnum">{sum.game.xp}</b><span>经验值 XP</span></div>
          <div><b>{sum.game.rank}</b><span>等级 Rank</span></div>
          <div><b class="tnum">{sum.game.stickers}</b><span>贴纸 Stickers (of {STICKERS.length})</span></div>
        </div>
      </div>

      <div class="card">
        <div class="small soft" style={{ marginBottom: 6 }}>进度代码 Progress code</div>
        <div class="code">{code}</div>
      </div>
    </div>
  );
}
