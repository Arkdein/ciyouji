import { useEffect, useState } from 'preact/hooks';
import { defaultState, sanitize } from './progress.js';
import { awardStickers } from './game.js';
import { VOCAB } from './vocab.js';
import { dayNumber } from './dates.js';

const KEY = 'h1vs:v2';
// Every state change is followed by a sticker check, so rewards never depend on which screen caused it.
function settle(s) {
  try {
    return awardStickers(s, VOCAB, dayNumber());
  } catch {
    return s;
  }
}
let state = settle(load());
const listeners = new Set();
let timer = null;
let storageOk = true;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitize(JSON.parse(raw)) : defaultState();
  } catch {
    storageOk = false;
    return defaultState();
  }
}

function persist() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      storageOk = false;
    }
  }, 150);
}

export const getState = () => state;
export const storageWorks = () => storageOk;

/** update(fn): fn receives the current state and returns the next one. */
export function update(fn) {
  state = settle(fn(state));
  persist();
  listeners.forEach((l) => l(state));
}

export function replaceState(raw) {
  state = settle(sanitize(raw));
  persist();
  listeners.forEach((l) => l(state));
}

export function resetState() {
  state = defaultState();
  persist();
  listeners.forEach((l) => l(state));
}

export function useStore() {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    setS(state);
    return () => listeners.delete(setS);
  }, []);
  return s;
}

// Flush a pending write if the page is hidden or closed.
if (typeof window !== 'undefined') {
  const flush = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
}
