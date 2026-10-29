import { useRef, useState } from 'preact/hooks';
import { useStore, update, replaceState, resetState, getState, storageWorks } from '../lib/store.js';
import { useToday, go } from '../lib/hooks.js';
import { STRANDS } from '../lib/vocab.js';
import { cacheAllAudio, clipCount, loadAudioManifest } from '../lib/audio.js';
import { cacheAllStrokes } from '../lib/strokes.js';
import { isoFromDay, dayFromIso } from '../lib/dates.js';
import { Icon } from '../components/Icon.jsx';

export function Progress() {
  const st = useStore();
  const today = useToday();
  const [audioMsg, setAudioMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef(null);

  const setProfile = (k, v) => update((s) => ({ ...s, profile: { ...s.profile, [k]: v } }));
  const setSetting = (k, v) => update((s) => ({ ...s, settings: { ...s.settings, [k]: v } }));
  const examDays = st.exam.date ? dayFromIso(st.exam.date) - today : null;

  const saveAudio = async () => {
    await loadAudioManifest();
    let clips = 0;
    if (clipCount()) {
      setAudioMsg('下载音频 Downloading audio… 0%');
      clips = await cacheAllAudio((d, t) => setAudioMsg(`下载音频 Downloading audio… ${Math.round((100 * d) / t)}%`));
    }
    setAudioMsg('下载笔顺 Downloading stroke data… 0%');
    const chars = await cacheAllStrokes((d, t) => setAudioMsg(`下载笔顺 Downloading stroke data… ${Math.round((100 * d) / t)}%`));
    setAudioMsg(`完成：${clips} 个音频、${chars} 个字的笔顺已保存，离线可用。 Done: ${clips} audio clips and ${chars} characters saved for offline use.`);
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(getState())], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `词游记-备份-${isoFromDay(today)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    setBackupMsg('已下载备份文件。 Backup file downloaded.');
  };
  const restore = async (e) => {
    const f = e.currentTarget.files?.[0];
    if (!f) return;
    try {
      const raw = JSON.parse(await f.text());
      if (!raw || typeof raw !== 'object' || !raw.cards) throw new Error('bad');
      replaceState(raw);
      setBackupMsg('已恢复进度。 Progress restored.');
    } catch {
      setBackupMsg('这不是有效的备份文件。 That is not a valid backup file.');
    }
    e.currentTarget.value = '';
  };

  return (
    <>
      <div class="page-head">
        <h1>我的进度</h1>
        <div class="en">Progress, settings and teacher report</div>
      </div>

      {!storageWorks() && (
        <div class="notice" style={{ marginBottom: 16 }}>
          <b>无法保存进度 Progress cannot be saved.</b> 这个浏览器阻止了本地存储（例如隐私模式）。请换一个普通窗口。 This browser is blocking local storage (private mode, for example), so progress will be lost when you close the tab.
        </div>
      )}

      <section class="card">
        <h2>给老师的进度报告</h2>
        <div class="small soft">Report for your teacher</div>
        <div class="stack">
          <div class="grid2">
            <label class="field">班级 Class<input value={st.profile.cls} onInput={(e) => setProfile('cls', e.currentTarget.value)} placeholder="例如 24S53" maxLength={20} /></label>
            <label class="field">学号 Index number<input value={st.profile.idx} onInput={(e) => setProfile('idx', e.currentTarget.value)} placeholder="例如 07" maxLength={20} /></label>
          </div>
          <div class="notice">只有班级、学号，以及报告里看得到的数字会发给老师；你的作答内容不会外传。 Only your class, index number and the counts shown in the report are shared, and only when you press Send. Your answers never leave this device.</div>
          <div class="row">
            <button class="btn primary" onClick={() => go('#/report')}><Icon name="print" /> 查看报告 View report</button>
            {st.sent && <span class="small soft">上次发送 Last sent: {st.sent.slice(0, 16).replace('T', ' ')}</span>}
          </div>
        </div>
      </section>

      <section class="card">
        <h2>考试与每日目标</h2>
        <div class="small soft">Exam date and daily pace</div>
        <div class="stack">
          <label class="field">考试日期 Exam date
            <input type="date" value={st.exam.date || ''} min={isoFromDay(today)} onInput={(e) => update((s) => ({ ...s, exam: { date: e.currentTarget.value || null } }))} />
          </label>
          {examDays != null && <div class="small soft">{examDays >= 0 ? `距离考试还有 ${examDays} 天。 ${examDays} days to go.` : '考试日期已过。 That date has passed.'}</div>}
          <div class="field">每天新词数量 New words per day
            <div class="seg" role="group">
              {[3, 5, 8, 12].map((n) => (
                <button key={n} class={st.settings.newPerDay === n ? 'on' : ''} onClick={() => setSetting('newPerDay', n)}>{n}</button>
              ))}
            </div>
          </div>
          <label class="field">优先学习的主题 Focus list (new words come from here first)
            <select value={st.settings.focus || ''} onChange={(e) => setSetting('focus', e.currentTarget.value || null)}>
              <option value="">不指定 No preference</option>
              {STRANDS.map((s) => <option key={s.id} value={s.id}>{s.id === 'idiom' ? '成语库' : `${s.num}. ${s.cn}`}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section class="card">
        <h2>偏好</h2>
        <div class="small soft">Preferences</div>
        <div class="stack">
          <label class="switch"><span>安静模式：不出听写题 <span class="soft small">Quiet mode: no listening questions (for class or the library)</span></span><input type="checkbox" checked={st.settings.quiet} onChange={(e) => setSetting('quiet', e.currentTarget.checked)} /></label>
          <label class="switch"><span>显示英文释义 <span class="soft small">Show English meanings</span></span><input type="checkbox" checked={st.settings.showEn} onChange={(e) => setSetting('showEn', e.currentTarget.checked)} /></label>
          <div class="field">主题 Theme
            <div class="seg" role="group">
              {[['system', '跟随系统'], ['light', '浅色'], ['dark', '深色']].map(([k, l]) => (
                <button key={k} class={st.settings.theme === k ? 'on' : ''} onClick={() => setSetting('theme', k)}>{l}</button>
              ))}
            </div>
          </div>
          <div class="field">离线使用 Offline use
            <div class="row"><button class="btn ghost small" onClick={saveAudio}>保存音频与笔顺 Save audio and stroke data</button><span class="small soft">{audioMsg}</span></div>
            <span class="small soft">应用本身离线也能用；音频和笔顺要先保存一次。 The app works offline; audio and handwriting data only work offline after you save them once while connected.</span>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>备份与重置</h2>
        <div class="small soft">Backup and reset. Progress lives only in this browser, so back it up before changing phones or clearing data.</div>
        <div class="stack">
          <div class="row">
            <button class="btn ghost small" onClick={downloadBackup}>下载备份 Download backup</button>
            <button class="btn ghost small" onClick={() => fileRef.current?.click()}>恢复备份 Restore backup</button>
            <input ref={fileRef} type="file" accept="application/json,.json" class="sr" onChange={restore} />
          </div>
          {backupMsg && <div class="small">{backupMsg}</div>}
          <div class="row">
            {!confirmReset ? (
              <button class="btn ghost small" onClick={() => setConfirmReset(true)}>清除所有进度 Reset all progress</button>
            ) : (
              <>
                <button class="btn small" style={{ background: 'var(--seal)', color: '#fff' }} onClick={() => { resetState(); setConfirmReset(false); setBackupMsg('已清除。 Progress cleared.'); }}>确定清除 Yes, erase everything</button>
                <button class="btn ghost small" onClick={() => setConfirmReset(false)}>取消 Cancel</button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
