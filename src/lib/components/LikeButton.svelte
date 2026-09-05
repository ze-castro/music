<script lang="ts">
  import { Heart } from '@lucide/svelte';
  import { likes } from '$lib/stores/likes.svelte';
  import type { Track } from '$lib/types';
  let {
    track,
    size = 16,
    class: cls = '',
  }: { track: Track; size?: number; class?: string } = $props();
  const on = $derived(likes.is(track));
</script>

<button
  onclick={(e) => {
    e.stopPropagation();
    likes.toggle(track);
  }}
  aria-label={on ? 'Unlike' : 'Like'}
  aria-pressed={on}
  class="grid shrink-0 place-items-center rounded-full p-1.5 {on
    ? 'text-foreground'
    : 'text-muted-foreground hover:text-foreground'} {cls}"
>
  <Heart {size} fill={on ? 'currentColor' : 'none'} />
</button>
