import { player } from './player.svelte';

// Separate <audio> for Deezer 30 s previews. Pauses main player while previewing.
// Source is always our own /api/recs/preview/<id>?kind=… which redirects to a fresh Deezer URL.
class Preview {
  key = $state<string | null>(null);
  error = $state<string | null>(null);
  #a: HTMLAudioElement | null = null;

  toggle(kind: 'track' | 'album', id: number) {
    const k = `${kind}:${id}`;
    if (this.key === k) {
      this.stop();
      return;
    }
    if (player.playing) player.toggle();
    this.#a ??= this.#make();
    this.error = null;
    this.#a.src = `/api/recs/preview/${id}?kind=${kind}`;
    this.key = k;
    this.#a.play().catch(() => this.stop());
  }
  is(kind: 'track' | 'album', id: number) {
    return this.key === `${kind}:${id}`;
  }
  stop() {
    this.#a?.pause();
    this.key = null;
  }
  #make() {
    const a = new Audio();
    a.preload = 'none';
    a.addEventListener('ended', () => (this.key = null));
    a.addEventListener('error', () => {
      this.key = null;
      this.error = 'No preview available';
    });
    return a;
  }
}
export const preview = new Preview();
