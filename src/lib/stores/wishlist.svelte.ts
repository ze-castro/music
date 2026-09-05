import type { WishItem, WishRow } from '$lib/wishlist-types';

const key = (i: { kind: string; deezerId: number }) => `${i.kind}:${i.deezerId}`;

class Wishlist {
  items = $state<WishRow[]>([]);
  #keys = $derived(new Set(this.items.map(key)));
  has(i: { kind: string; deezerId: number }) {
    return this.#keys.has(key(i));
  }
  set(rows: WishRow[]) {
    this.items = rows;
  }
  async toggle(item: WishItem) {
    const existing = this.items.find((r) => key(r) === key(item));
    if (existing) {
      this.items = this.items.filter((r) => r.id !== existing.id);
      await fetch(`/api/wishlist/${existing.id}`, { method: 'DELETE' });
    } else {
      const tmp: WishRow = { id: 'tmp-' + key(item), addedAt: new Date().toISOString(), ...item };
      this.items = [tmp, ...this.items];
      const r = await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (r.ok) {
        const { id } = await r.json();
        this.items = this.items.map((x) => (x.id === tmp.id ? { ...x, id } : x));
      } else this.items = this.items.filter((x) => x.id !== tmp.id);
    }
  }
  /** Plain-text export for whatever downloader you use later. */
  exportText() {
    return this.items
      .map((i) =>
        i.kind === 'artist'
          ? `[artist] ${i.title}`
          : i.kind === 'album'
            ? `[album] ${i.artist} - ${i.title}${i.year ? ` (${i.year})` : ''}`
            : `[track] ${i.artist} - ${i.title}${i.album ? ` (${i.album})` : ''}`,
      )
      .join('\n');
  }
}
export const wishlist = new Wishlist();
