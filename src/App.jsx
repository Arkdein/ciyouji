import { useEffect } from 'preact/hooks';
import { useStore, update } from './lib/store.js';
import { useRoute } from './lib/hooks.js';
import { Icon } from './components/Icon.jsx';
import { loadAudioManifest } from './lib/audio.js';
import { Home } from './screens/Home.jsx';
import { Session } from './screens/Session.jsx';
import { Words } from './screens/Words.jsx';
import { News } from './screens/News.jsx';
import { Progress } from './screens/Progress.jsx';
import { Report } from './screens/Report.jsx';

const NAV = [
  { name: 'home', href: '#/', icon: 'home', cn: '行程', en: 'Trip' },
  { name: 'words', href: '#/words/s1', icon: 'book', cn: '词汇库', en: 'Word bank' },
  { name: 'news', href: '#/news/s1', icon: 'news', cn: '时事', en: 'News' },
  { name: 'progress', href: '#/progress', icon: 'chart', cn: '进度', en: 'Progress' },
];

export function App() {
  const route = useRoute();
  const st = useStore();

  useEffect(() => {
    loadAudioManifest();
  }, []);

  useEffect(() => {
    const t = st.settings.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }, [st.settings.theme]);

  if (route.name === 'session') return <Session mode={route.mode} strand={route.strand} />;

  const nextTheme = { system: 'light', light: 'dark', dark: 'system' }[st.settings.theme];
  const themeLabel = { system: '跟随系统', light: '浅色', dark: '深色' }[st.settings.theme];

  return (
    <div class="shell">
      <aside class="rail">
        <div class="brand">
          <div class="mark" aria-hidden="true">词</div>
          <div>
            <div class="name">词游记</div>
            <div class="sub">Word Journey</div>
          </div>
        </div>
        <nav class="nav" aria-label="主导航 Main">
          {NAV.map((n) => (
            <a key={n.name} href={n.href} class={route.name === n.name ? 'active' : ''} aria-current={route.name === n.name ? 'page' : undefined}>
              <Icon name={n.icon} />
              <span class="lbl">{n.cn}<small>{n.en}</small></span>
            </a>
          ))}
        </nav>
        <div class="rail-foot">
          <span class="small soft">进度存于本机<br />Saved on this device</span>
          <button class="theme-btn" onClick={() => update((s) => ({ ...s, settings: { ...s.settings, theme: nextTheme } }))} title="切换主题 Change theme">
            <Icon name="moon" /> {themeLabel}
          </button>
        </div>
      </aside>
      <main class="main" id="main">
        {route.name === 'home' && <Home />}
        {route.name === 'words' && <Words strand={route.strand} />}
        {route.name === 'news' && <News strand={route.strand} />}
        {route.name === 'progress' && <Progress />}
        {route.name === 'report' && <Report />}
      </main>
      <nav class="tabbar" aria-label="主导航 Main">
        {NAV.map((n) => (
          <a key={n.name} href={n.href} class={route.name === n.name ? 'active' : ''}>
            <Icon name={n.icon} />
            {n.cn}
          </a>
        ))}
      </nav>
    </div>
  );
}
