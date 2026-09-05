<script lang="ts">
  import { player } from '$lib/stores/player.svelte';
  import { fmtTime } from '$lib/utils';
  import type { Track } from '$lib/types';
  import Artwork from './Artwork.svelte';
  import LikeButton from './LikeButton.svelte';
  // `queue` = what actually plays (may be longer than rendered `tracks`, e.g. paginated lists)
  // `context` = 'album' hides album link (already on album page)
  let {
    tracks,
    queue = tracks,
    showArt = true,
    numbered = false,
    context = 'list',
  }: {
    tracks: Track[];
    queue?: Track[];
    showArt?: boolean;
    numbered?: boolean;
    context?: 'list' | 'album';
  } = $props();
  const play = (t: Track, i: number) =>
    player.playQueue(queue, queue === tracks ? i : queue.indexOf(t));
</script>

<ol class="divide-y">
  {#each tracks as t, i (t.id + i)}
    <li
      class="flex items-center gap-3 px-2 py-2 hover:bg-accent/60 {player.current?.id === t.id
        ? 'bg-accent'
        : ''}"
    >
      {#if numbered}<button
          onclick={() => play(t, i)}
          class="w-6 text-right text-xs tabular-nums text-muted-foreground"
          >{t.track ?? i + 1}</button
        >{/if}
      {#if showArt}<button onclick={() => play(t, i)} class="shrink-0" aria-label="Play"
          ><Artwork
            coverArt={t.coverArt}
            name={t.album ?? t.title}
            size={100}
            class="h-10 w-10"
          /></button
        >{/if}
      <div class="min-w-0 flex-1">
        <button onclick={() => play(t, i)} class="block w-full truncate text-left text-sm"
          >{t.title}</button
        >
        <div class="truncate text-xs text-muted-foreground">
          {#if t.artistId}<a
              href="/artists/{t.artistId}"
              class="hover:underline hover:text-foreground">{t.artist}</a
            >{:else}{t.artist}{/if}
          {#if context !== 'album' && t.album}
            <span aria-hidden="true"> · </span>
            {#if t.albumId}<a
                href="/albums/{t.albumId}"
                class="hover:underline hover:text-foreground">{t.album}</a
              >{:else}{t.album}{/if}
          {/if}
        </div>
      </div>
      <LikeButton track={t} />
      <button onclick={() => play(t, i)} class="text-xs tabular-nums text-muted-foreground"
        >{fmtTime(t.duration)}</button
      >
    </li>
  {/each}
</ol>
