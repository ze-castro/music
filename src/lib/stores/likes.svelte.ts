import type { Track } from '$lib/types';

// Optimistic star state. Server data (`t.starred`) is the base; overrides win within session.
class Likes {
  #o = $state<Record<string, boolean>>({});
  is(t: Track) {
    return this.#o[t.id] ?? !!t.starred;
  }
  async toggle(t: Track) {
    const next = !this.is(t);
    this.#o[t.id] = next;
    try {
      const r = await fetch('/api/star', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: t.id, starred: next }),
      });
      if (!r.ok) throw new Error();
    } catch {
      this.#o[t.id] = !next; // revert
    }
  }
}
export const likes = new Likes();
