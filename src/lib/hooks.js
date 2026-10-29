import { useEffect, useState } from 'preact/hooks';
import { dayNumber } from './dates.js';

export function parseRoute(hash) {
  const [a, b, c] = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!a) return { name: 'home' };
  if (a === 'session') return { name: 'session', mode: b || 'daily', strand: c || null };
  if (a === 'words') return { name: 'words', strand: b || 's1' };
  if (a === 'news') return { name: 'news', strand: b || 'all' };
  if (a === 'write') return { name: 'write', mode: b || null, arg: c ? decodeURIComponent(c) : null };
  if (a === 'progress') return { name: 'progress' };
  if (a === 'report') return { name: 'report' };
  return { name: 'home' };
}

export function useRoute() {
  const [h, setH] = useState(location.hash);
  useEffect(() => {
    const f = () => {
      setH(location.hash);
      window.scrollTo(0, 0);
    };
    addEventListener('hashchange', f);
    return () => removeEventListener('hashchange', f);
  }, []);
  return parseRoute(h);
}

export const go = (path) => {
  location.hash = path;
};

/** Today's day number, refreshed when the tab becomes visible again (midnight rollover). */
export function useToday() {
  const [d, setD] = useState(dayNumber());
  useEffect(() => {
    const f = () => setD(dayNumber());
    document.addEventListener('visibilitychange', f);
    const t = setInterval(f, 60000);
    return () => {
      document.removeEventListener('visibilitychange', f);
      clearInterval(t);
    };
  }, []);
  return d;
}

let configPromise = null;
export function loadConfig() {
  if (!configPromise) {
    configPromise = fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  return configPromise;
}
export function useConfig() {
  const [c, setC] = useState(null);
  useEffect(() => {
    loadConfig().then(setC);
  }, []);
  return c;
}
