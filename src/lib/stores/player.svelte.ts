import type { Track } from '$lib/types';
import { settings } from './settings.svelte';

export type RepeatMode = 'off' | 'all' | 'one';

// WebKit's Audio Session API (Safari 16.4+). Not in TS's lib.dom yet.
type NavigatorWithAudioSession = Navigator & {
  audioSession?: { type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record' };
};

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
  volume = $state(settings.s.volume);
  muted = $state(settings.s.muted);

  current = $derived(this.index >= 0 ? (this.queue[this.index] ?? null) : null);

  #audio: HTMLAudioElement | null = null;
  #scrobbled = false;
  #history: number[] = [];
  // Bumped on every track change; async callbacks from an older load compare against it.
  #loadId = 0;
  #errorTimer: ReturnType<typeof setTimeout> | undefined;

  #el(): HTMLAudioElement {
    if (this.#audio) return this.#audio;
    // iOS: with the default 'auto' session, WebKit can deactivate audio output in the gap between
    // `ended` and the next source starting while the screen is locked. The next track then
    // "plays" (time advances, lock screen updates) but is silent. 'playback' pins it as music.
    const session = (navigator as NavigatorWithAudioSession).audioSession;
    if (session) session.type = 'playback';

    const a = new Audio();
    a.preload = 'auto';
    a.volume = this.volume;
    a.muted = this.muted;
    a.addEventListener('timeupdate', () => {
      this.currentTime = a.currentTime;
      this.#maybeScrobble();
    });
    a.addEventListener('durationchange', () => {
      // Transcoded streams can report Infinity/NaN; fall back to the tag duration.
      this.duration = Number.isFinite(a.duration) ? a.duration : (this.current?.duration ?? 0);
    });
    a.addEventListener('play', () => {
      this.playing = true;
      this.#mediaMetadata();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
    });
    a.addEventListener('pause', () => {
      this.playing = false;
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    });
    // `a.ended` is false if this event belongs to a source we already replaced.
    a.addEventListener('ended', () => {
      if (a.ended) this.next(true);
    });
    // iOS Safari: with transcoding, Navidrome's estimated Content-Length can be larger than
    // the real stream. Safari then waits for bytes that never come and `ended` never fires.
    const advanceIfStuckAtEnd = () => {
      if (this.#stuckAtEnd()) this.next(true);
    };
    a.addEventListener('stalled', advanceIfStuckAtEnd);
    a.addEventListener('waiting', advanceIfStuckAtEnd);
    a.addEventListener('error', () => this.#onError());
    this.#bindMediaSession();
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
    const id = ++this.#loadId;
    clearTimeout(this.#errorTimer);
    const t = this.queue[i];
    this.index = i;
    this.error = null;
    this.#scrobbled = false;
    this.currentTime = 0;
    this.duration = t.duration ?? 0;

    const a = this.#el();
    const url = new URL(this.streamUrl(t), location.href).href;
    // Assigning a new src already starts loading; an extra load() makes Safari abort and re-request.
    if (a.src !== url) a.src = url;
    else a.load(); // same track again (repeat-one, prev at queue start, retry after error)

    if (autoplay) {
      a.play().catch((e: unknown) => {
        // AbortError = interrupted by a newer load (fast skipping). Expected, not a failure.
        if (id !== this.#loadId) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        this.error = `Couldn't start playback: ${e instanceof Error ? e.message : String(e)}`;
        this.playing = false;
      });
    }
  }

  #onError() {
    const a = this.#audio;
    // load() resets `a.error` to null, so a stale error from a replaced source is skipped here.
    if (!a?.error || a.error.code === MediaError.MEDIA_ERR_ABORTED) return;
    const id = this.#loadId;
    this.error = `Playback failed for “${this.current?.title ?? 'track'}”`;
    this.playing = false;
    clearTimeout(this.#errorTimer);
    this.#errorTimer = setTimeout(() => {
      if (id === this.#loadId) this.next(true);
    }, 1500);
  }

  #stuckAtEnd(): boolean {
    const a = this.#audio;
    // Tag duration, not a.duration: Safari derives the latter from the (wrong) estimated length.
    const known = this.current?.duration;
    if (!a || a.paused || !known) return false;
    return a.currentTime >= known - 1.5;
  }

  // Repeat-one only applies to auto-advance; pressing Next should always move on.
  #nextIndex(auto: boolean): number | null {
    if (auto && this.repeat === 'one') return this.index;
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
    this.#el().paused ? this.play() : this.pause();
  }
  play() {
    if (!this.current) return;
    this.#el().play().catch(() => {});
  }
  pause() {
    this.#audio?.pause();
  }
  next(auto = false) {
    const n = this.#nextIndex(auto);
    if (n === null) {
      if (auto) this.playing = false;
      return;
    }
    if (n !== this.index) this.#history.push(this.index);
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

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volume > 0) this.muted = false;
    const a = this.#el();
    a.volume = this.volume;
    a.muted = this.muted;
    settings.set('volume', this.volume);
    settings.set('muted', this.muted);
  }
  toggleMute() {
    this.muted = !this.muted;
    this.#el().muted = this.muted;
    settings.set('muted', this.muted);
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

  #mediaMetadata() {
    if (!('mediaSession' in navigator) || !this.current) return;
    const c = this.current;
    const art = this.coverUrl(c, 512);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: c.title,
      artist: c.artist ?? '',
      album: c.album ?? '',
      artwork: art ? [{ src: art, sizes: '512x512', type: 'image/jpeg' }] : [],
    });
  }

  // Explicit play/pause, not toggle: if the element and iOS disagree about state, a lock-screen
  // "play" must never pause.
  #bindMediaSession() {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    ms.setActionHandler('play', () => this.play());
    ms.setActionHandler('pause', () => this.pause());
    ms.setActionHandler('previoustrack', () => this.prev());
    ms.setActionHandler('nexttrack', () => this.next());
    ms.setActionHandler('seekto', (d) => {
      if (d.seekTime != null) this.seek(d.seekTime);
    });
  }
}

export const player = new Player();
