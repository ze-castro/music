import { browser } from '$app/environment';

export interface Settings {
  theme: 'dark' | 'light';
  gapless: boolean; // preload next track
  normalize: boolean; // apply ReplayGain track gain via Web Audio
  maxBitRate: number; // 0 = original
}
const DEFAULTS: Settings = { theme: 'dark', gapless: true, normalize: false, maxBitRate: 0 };
const KEY = 'music.settings';

function load(): Settings {
  if (!browser) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

class SettingsStore {
  s = $state<Settings>(load());
  set<K extends keyof Settings>(k: K, v: Settings[K]) {
    this.s[k] = v;
    if (browser) localStorage.setItem(KEY, JSON.stringify(this.s));
    if (k === 'theme') {
      document.documentElement.classList.toggle('dark', v === 'dark');
      localStorage.setItem('theme', String(v)); // read by app.html pre-paint script
    }
  }
}
export const settings = new SettingsStore();