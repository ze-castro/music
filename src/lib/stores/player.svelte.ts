import type { Track } from '$lib/types';
import { settings } from './settings.svelte';

export type RepeatMode = 'off' | 'all' | 'one';

// WebKit's Audio Session API (Safari 16.4+). Not in TS's lib.dom yet.
type NavigatorWithAudioSession = Navigator & {
  audioSession?: { type: 'auto' | 'playback' | 'transient' | 'transient-solo' | 'ambient' | 'play-and-record' };
};

// Next track downloaded in full ahead of time. See #prefetchNext.
type Prefetch = { key: string; ctrl: AbortController; blobUrl: string | null };

// Cover sizes the player UI asks for. Shared so the prefetch warms exactly these.
export const ART = { mini: 120, full: 800 } as const;
// This many failures in a row means the problem isn't the track; stop auto-skipping.
const MAX_FAILS = 3;
// How close to the end a hidden iOS page switches tracks. timeupdate fires about every 0.25 s,
// so this guarantees one tick lands inside the window. See #handOverEarly.
const HANDOVER_S = 0.5;

class Player {
  queue = $state<Track[]>([]);
  index = $state(-1);
  playing = $state(false);
  // Waiting for audio data: track starting, seeking, or the connection fell behind.
  buffering = $state(false);
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
  #bufferTimer: ReturnType<typeof setTimeout> | undefined;
  #pre: Prefetch | null = null;
  // Stream key of the loaded source, and its blob URL when it plays from a prefetch.
  #currentKey: string | null = null;
  #currentBlobUrl: string | null = null;
  // The loaded source has begun rendering audio.
  #started = false;
  #failStreak = 0;
  // iPhone/iPad WebKit (touch + Audio Session API). See #handOverEarly.
  #ios = false;
  // Shuffle's choice for the next track, fixed in advance so the prefetch targets the right one.
  #shufflePick: number | null = null;
  // Next track's covers. Held so the decoded images stay in the browser's memory cache.
  #warm: HTMLImageElement[] = [];

  #el(): HTMLAudioElement {
    if (this.#audio) return this.#audio;
    // iOS: with the default 'auto' session, WebKit can deactivate audio output in the gap between
    // `ended` and the next source starting while the screen is locked. The next track then
    // "plays" (time advances, lock screen updates) but is silent. 'playback' pins it as music.
    const session = (navigator as NavigatorWithAudioSession).audioSession;
    if (session) session.type = 'playback';
    this.#ios = !!session && navigator.maxTouchPoints > 0;

    const a = new Audio();
    a.preload = 'auto';
    a.volume = this.volume;
    a.muted = this.muted;
    a.addEventListener('timeupdate', () => {
      this.currentTime = a.currentTime;
      this.#maybeScrobble();
      // Re-checked every tick: shuffle, repeat and queue edits change which track is next.
      this.#prefetchWhenSafe(a);
      this.#handOverEarly(a);
    });
    a.addEventListener('durationchange', () => {
      // Transcoded streams can report Infinity/NaN; fall back to the tag duration.
      this.duration = Number.isFinite(a.duration) ? a.duration : (this.current?.duration ?? 0);
    });
    a.addEventListener('play', () => {
      this.playing = true;
      this.#mediaMetadata();
      this.#bindMediaSession();
    });
    // 'playing' (audio actually rendering), not 'play': otherwise the lock screen's clock runs
    // while the element is still waiting for data.
    a.addEventListener('playing', () => {
      this.#wait(false);
      this.#failStreak = 0;
      this.#bindMediaSession();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
      this.#started = true;
      this.#prefetchWhenSafe(a);
    });
    a.addEventListener('pause', () => {
      this.playing = false;
      this.#wait(false);
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
    a.addEventListener('waiting', () => {
      if (!a.paused) this.#wait(true);
      advanceIfStuckAtEnd();
    });
    a.addEventListener('error', () => this.#onError());
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
    this.#failStreak = 0;
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

    this.#shufflePick = null;
    this.#started = false;
    this.#wait(autoplay);

    const a = this.#el();
    const key = this.streamUrl(t);
    const pre = this.#pre;
    this.#pre = null;
    let blobUrl: string | null = null;
    if (pre?.key === key && pre.blobUrl) {
      blobUrl = pre.blobUrl;
    } else {
      this.#discard(pre);
      // Same track again: the copy already in memory is still good.
      if (key === this.#currentKey) blobUrl = this.#currentBlobUrl;
    }
    const url = blobUrl ?? new URL(key, location.href).href;
    // Assigning a new src already starts loading; an extra load() makes Safari abort and re-request.
    if (a.src !== url) a.src = url;
    else a.load(); // same track again (repeat-one, prev at queue start, retry after error)
    // Safe to free only after the element has switched away from it.
    if (this.#currentBlobUrl && this.#currentBlobUrl !== url) URL.revokeObjectURL(this.#currentBlobUrl);
    this.#currentBlobUrl = blobUrl;
    this.#currentKey = key;

    if (autoplay) {
      a.play().catch((e: unknown) => {
        // AbortError = interrupted by a newer load (fast skipping). Expected, not a failure.
        if (id !== this.#loadId) return;
        if (e instanceof DOMException && e.name === 'AbortError') return;
        // The source itself failed: the `error` event reports that (and decides whether to skip).
        if (a.error) return;
        this.error = `Couldn't start playback: ${e instanceof Error ? e.message : String(e)}`;
        this.playing = false;
        this.#wait(false);
      });
    }
  }

  // Raised only after a short delay, so a quick start doesn't flash a spinner.
  #wait(on: boolean) {
    clearTimeout(this.#bufferTimer);
    if (on) this.#bufferTimer = setTimeout(() => (this.buffering = true), 400);
    else this.buffering = false;
  }

  #onError() {
    const a = this.#audio;
    // load() resets `a.error` to null, so a stale error from a replaced source is skipped here.
    if (!a?.error || a.error.code === MediaError.MEDIA_ERR_ABORTED) return;
    const id = this.#loadId;
    this.playing = false;
    this.#wait(false);
    // Don't reuse a source that just failed (see #load).
    this.#currentKey = null;
    clearTimeout(this.#errorTimer);
    void this.#signedOut().then((out) => {
      if (out) location.reload();
    });
    if (++this.#failStreak >= MAX_FAILS) {
      this.error = 'Playback keeps failing. Check your connection and try again.';
      return;
    }
    this.error = `Playback failed for “${this.current?.title ?? 'track'}”`;
    this.#errorTimer = setTimeout(() => {
      if (id === this.#loadId) this.next(true);
    }, 1500);
  }

  // A failed stream can also mean the sign-in expired: ours, or an auth proxy's in front of the app
  // (Cloudflare Access answers 401 to XHR-marked requests, a redirect otherwise). Skipping tracks
  // can't fix that; a full page load can, because only a navigation gets to re-authenticate.
  async #signedOut(): Promise<boolean> {
    try {
      const r = await fetch('/api/ping', {
        headers: { 'x-requested-with': 'XMLHttpRequest' },
        redirect: 'manual',
        cache: 'no-store',
      });
      return r.status === 401 || r.type === 'opaqueredirect';
    } catch {
      return false; // offline or server down: not an auth problem
    }
  }

  #stuckAtEnd(): boolean {
    const a = this.#audio;
    // Tag duration, not a.duration: Safari derives the latter from the (wrong) estimated length.
    const known = this.current?.duration;
    if (!a || a.paused || !known) return false;
    return a.currentTime >= known - 1.5;
  }

  #remaining(): number[] {
    return this.queue.map((_, i) => i).filter((i) => i !== this.index && !this.#history.includes(i));
  }

  // Repeat-one only applies to auto-advance; pressing Next should always move on.
  // No side effects besides fixing the shuffle pick, so the prefetch can call it to peek.
  #nextIndex(auto: boolean): number | null {
    if (auto && this.repeat === 'one') return this.index;
    if (this.shuffle) {
      const remaining = this.#remaining();
      const pool = remaining.length ? remaining : this.repeat === 'all' ? this.queue.map((_, i) => i) : [];
      if (pool.length === 0) return null;
      if (this.#shufflePick === null || !pool.includes(this.#shufflePick)) {
        this.#shufflePick = pool[Math.floor(Math.random() * pool.length)];
      }
      return this.#shufflePick;
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
      if (auto) {
        this.playing = false;
        this.#wait(false);
      }
      return;
    }
    // Shuffle wrapped around (repeat-all): start a fresh cycle.
    if (this.shuffle && this.#remaining().length === 0) this.#history = [];
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
    this.currentTime = sec; // don't wait for the next timeupdate; the seek bar would jump back
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
    this.#discard(this.#pre);
    this.#pre = null;
    const a = this.#audio;
    if (!a || !this.current) return;
    const t = a.currentTime,
      wasPlaying = !a.paused;
    a.src = this.#currentKey = this.streamUrl(this.current);
    a.load();
    if (this.#currentBlobUrl) URL.revokeObjectURL(this.#currentBlobUrl);
    this.#currentBlobUrl = null;
    a.currentTime = t;
    if (wasPlaying) a.play().catch(() => {});
  }

  // iOS: while locked, starting a *network* stream for the next track can take long enough
  // (Navidrome spinning up a transcode, tunnel round trips) that iOS cuts the page's audio.
  // Downloading the next track in full during the current one makes the switch instant.
  // Cheap to call repeatedly: returns early while the planned track hasn't changed.
  #prefetchNext() {
    const n = this.#nextIndex(true);
    const next = n === null ? null : this.queue[n];
    let key = next ? this.streamUrl(next) : null;
    // Repeating a track that already plays from memory: #load reuses that copy.
    if (key === this.#currentKey && this.#currentBlobUrl) key = null;
    if ((this.#pre?.key ?? null) === key) return;
    this.#discard(this.#pre);
    this.#pre = null;
    if (!key || !next) return;
    const pre: Prefetch = { key, ctrl: new AbortController(), blobUrl: null };
    this.#pre = pre;
    // Its artwork too, so the cover changes with the audio instead of loading after it.
    this.#warm = [ART.mini, ART.full].flatMap((size) => {
      const src = this.coverUrl(next, size);
      if (!src) return [];
      const img = new Image();
      img.src = src;
      return [img];
    });
    // Same stream as `key`, minus the estimated Content-Length (see /api/stream).
    fetch(`${key}${key.includes('?') ? '&' : '?'}estimate=0`, { signal: pre.ctrl.signal })
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((b) => {
        if (this.#pre === pre) pre.blobUrl = URL.createObjectURL(b);
      })
      // On failure keep `pre` (blobUrl null) so we don't retry every timeupdate; #load streams instead.
      .catch(() => {});
  }

  // Start the prefetch as early as possible, so even a quick skip is instant, but never at the
  // current track's expense: until it is audible and has a few seconds buffered, the connection
  // is all its own. On a fast link that takes a fraction of a second; a track that already plays
  // from memory needs no wait at all. The 5 s mark is the fallback if `buffered` reports nothing.
  #prefetchWhenSafe(a: HTMLAudioElement) {
    if (!this.#started) return;
    if (this.#currentBlobUrl || a.currentTime > 5 || this.#bufferedAhead(a) >= 10) this.#prefetchNext();
  }

  // iOS: when a track plays to its very end and nothing else is playing, WebKit deactivates the
  // page's audio session, and a page that isn't on screen can't get it back. The next track then
  // "plays" (time advances, lock screen updates) in silence. WebKit bugs 261858 and 267606; the
  // Audio Session type doesn't prevent it. Deactivation only happens for an *ended* element, so
  // while hidden, never let one end: switch to the next track a fraction of a second early.
  #handOverEarly(a: HTMLAudioElement) {
    if (!this.#ios || !this.#started || a.paused || document.visibilityState !== 'hidden') return;
    if (!Number.isFinite(a.duration) || a.duration - a.currentTime > HANDOVER_S) return;
    if (this.#nextIndex(true) === null) return; // end of the queue: let it finish
    this.next(true);
  }

  #bufferedAhead(a: HTMLAudioElement): number {
    const t = a.currentTime;
    for (let i = 0; i < a.buffered.length; i++) {
      if (a.buffered.start(i) <= t && t <= a.buffered.end(i)) return a.buffered.end(i) - t;
    }
    return 0;
  }

  #discard(pre: Prefetch | null) {
    if (!pre) return;
    pre.ctrl.abort();
    if (pre.blobUrl) URL.revokeObjectURL(pre.blobUrl);
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
    const art = this.coverUrl(c, ART.full);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: c.title,
      artist: c.artist ?? '',
      album: c.album ?? '',
      artwork: art ? [{ src: art, sizes: `${ART.full}x${ART.full}`, type: 'image/jpeg' }] : [],
    });
  }

  // Called on every play/playing, not once at setup. WebKit keeps the page's handlers in an object
  // it creates and drops with its Now Playing state and never restores them; with none it shows its
  // default lock-screen controls (±10 s instead of previous/next). Registering again is harmless.
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
