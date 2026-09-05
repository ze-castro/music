<script lang="ts">
  import { Bookmark } from '@lucide/svelte';
  import { wishlist } from '$lib/stores/wishlist.svelte';
  import type { WishItem } from '$lib/wishlist-types';
  let {
    item,
    size = 16,
    class: cls = '',
  }: { item: WishItem; size?: number; class?: string } = $props();
  const on = $derived(wishlist.has(item));
</script>

<button
  onclick={(e) => {
    e.stopPropagation();
    wishlist.toggle(item);
  }}
  aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
  aria-pressed={on}
  class="grid shrink-0 place-items-center rounded-full {on
    ? 'text-foreground'
    : 'text-muted-foreground hover:text-foreground'} {cls}"
>
  <Bookmark {size} fill={on ? 'currentColor' : 'none'} />
</button>
