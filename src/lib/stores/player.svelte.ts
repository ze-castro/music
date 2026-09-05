import type { Track } from '$lib/types';
import { settings } from './settings.svelte';

export type RepeatMode = 'off' | 'all' | 'one';

class Player {
  queue = $state<Track[]>([]);
  index = $state(-1);
  playing = $state(false);
  currentTime = $state(0);
  duration = $state(0);
  shuffle = $state(false);
  repeat = $state<RepeatMode>('off');
  error = $state<string | null>(null);
  expanded = $state(false);

  current = $derived(this.index >= 0 ? (this.queue[this.index] ?? null) : null);

  #audio: HTMLAudioElement | null = null;
  #ctx: AudioContext | null = null;
  #gain: GainNode | null = null;
  #scrobbled = false;
  #history: number[] = [];

  #el(): HTMLAudioElement {
    if (this.#audio) return this.#audio;
    const a = new Audio();
    a.preload = 'auto';
    a.addEventListener('timeupdate', () => {
      this.currentTime = a.currentTime;
      this.#maybeScrobble();
    });
    a.addEventListener('durationchange', () => {
      this.duration = a.duration;
    });
    a.addEventListener('play', () => {
      this.playing = true;
      this.#mediaSession();
    });
    a.addEventListener('pause', () => {
      this.playing = false;
    });
    a.addEventListener('ended', () => this.next(true));
    a.addEventListener('error', () => {
      this.error = `Playback failed for “${this.current?.title ?? 'track'}”`;
      this.playing = false;
      setTimeout(() => {
        if (this.error) this.next(true);
      }, 1500);
    });
    this.#audio = a;
    return a;
  }

  streamUrl(t: Track) {
    const p = new URLSearchParams();
    if (settings.s.maxBitRate > 0) p.set('maxBitRate', String(settings.s.maxBitRate));
    const qs = p.toString();
    return `/api/stream/${t.id}${qs ? '?' + qs : ''}`;
  }
  coverUrl(t: Track | null, size = 600) {
    return t?.coverArt ? `/api/cover/${t.coverArt}?size=${size}` : null;
  }

  playQueue(tracks: Track[], startIndex = 0) {
    this.queue = tracks;
    this.#history = [];
    this.#load(startIndex, true);
  }
  playNext(t: Track) {
    this.queue.splice(this.index + 1, 0, t);
  }
  addToQueue(t: Track) {
    this.queue.push(t);
  }

  #load(i: number, autoplay: boolean) {
    if (i < 0 || i >= this.queue.length) return;
    this.index = i;
    this.error = null;
    this.#scrobbled = false;
    const a = this.#el();
    a.src = this.streamUrl(this.queue[i]);
    a.load();
    this.#applyGain(this.queue[i]);
    if (autoplay)
      a.play().catch((e) => {
        this.error = `Couldn't start playback: ${e?.message ?? e}`;
      });
    if (settings.s.gapless) this.#preloadNext();
  }

  #preloadNext() {
    const n = this.#nextIndex();
    if (n === null) return;
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'audio';
    link.href = this.streamUrl(this.queue[n]);
    document.head.appendChild(link);
    setTimeout(() => link.remove(), 60_000);
  }

  #nextIndex(): number | null {
    if (this.repeat === 'one') return this.index;
    if (this.shuffle) {
      const remaining = this.queue
        .map((_, i) => i)
        .filter((i) => i !== this.index && !this.#history.includes(i));
      if (remaining.length === 0) {
        if (this.repeat === 'all') {
          this.#history = [];
          return Math.floor(Math.random() * this.queue.length);
        }
        return null;
      }
      return remaining[Math.floor(Math.random() * remaining.length)];
    }
    if (this.index + 1 < this.queue.length) return this.index + 1;
    return this.repeat === 'all' ? 0 : null;
  }

  toggle() {
    const a = this.#el();
    if (!this.current) return;
    a.paused ? a.play().catch(() => {}) : a.pause();
  }
  next(auto = false) {
    const n = this.#nextIndex();
    if (n === null) {
      if (auto) {
        this.playing = false;
      }
      return;
    }
    this.#history.push(this.index);
    this.#load(n, true);
  }
  prev() {
    const a = this.#el();
    if (a.currentTime > 3) {
      a.currentTime = 0;
      return;
    }
    const p = this.#history.pop() ?? this.index - 1;
    this.#load(Math.max(0, p), true);
  }
  seek(sec: number) {
    this.#el().currentTime = sec;
  }
  seekBy(delta: number) {
    const a = this.#el();
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  }
  cycleRepeat() {
    this.repeat = this.repeat === 'off' ? 'all' : this.repeat === 'all' ? 'one' : 'off';
  }

  /** Web Audio gain chain. Created lazily inside a user gesture (iOS). */
  #ensureGraph() {
    if (this.#gain || !this.#audio) return;
    try {
      this.#ctx = new AudioContext();
      const src = this.#ctx.createMediaElementSource(this.#audio);
      this.#gain = this.#ctx.createGain();
      src.connect(this.#gain).connect(this.#ctx.destination);
    } catch {
      this.#ctx = null;
      this.#gain = null;
    }
  }
  #applyGain(t: Track | undefined) {
    if (!settings.s.normalize) {
      if (this.#gain) this.#gain.gain.value = 1;
      return;
    }
    this.#ensureGraph();
    if (!this.#gain) return;
    this.#ctx?.resume().catch(() => {});
    const db = t?.trackGain ?? t?.albumGain ?? 0;
    this.#gain.gain.value = Math.min(2, Math.max(0.1, Math.pow(10, db / 20)));
  }
  refreshGain() {
    this.#applyGain(this.current ?? undefined);
  }

  setBitrate(kbps: number) {
    settings.set('maxBitRate', kbps);
    const a = this.#audio;
    if (!a || !this.current) return;
    const t = a.currentTime,
      wasPlaying = !a.paused;
    a.src = this.streamUrl(this.current);
    a.load();
    a.currentTime = t;
    if (wasPlaying) a.play().catch(() => {});
  }

  #maybeScrobble() {
    if (this.#scrobbled || !this.current || !this.duration) return;
    const t = this.currentTime;
    if (t >= this.duration / 2 || t >= 240) {
      this.#scrobbled = true;
      const c = this.current;
      fetch('/api/scrobble', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          title: c.title,
          artist: c.artist ?? '',
          artistId: c.artistId,
          albumId: c.albumId,
        }),
      }).catch(() => {});
    }
  }

  #mediaSession() {
    if (!('mediaSession' in navigator) || !this.current) return;
    const c = this.current;
    const art = this.coverUrl(c, 512);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: c.title,
      artist: c.artist ?? '',
      album: c.album ?? '',
      artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
    navigator.mediaSession.setActionHandler('play', () => this.toggle());
    navigator.mediaSession.setActionHandler('pause', () => this.toggle());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) this.seek(d.seekTime);
    });
  }
}

export const player = new Player();
