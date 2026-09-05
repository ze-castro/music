<script lang="ts">
  import { Play, Pause, SkipForward, SkipBack } from '@lucide/svelte';
  import { player } from '$lib/stores/player.svelte';
  import Artwork from './Artwork.svelte';
  const pct = $derived(player.duration ? (player.currentTime / player.duration) * 100 : 0);
  let startY = 0;
  function tstart(e: TouchEvent) {
    startY = e.touches[0].clientY;
  }
  function tmove(e: TouchEvent) {
    if (startY - e.touches[0].clientY > 40) {
      player.expanded = true;
      startY = 0;
    }
  }
</script>

{#if player.current}
  <div
    class="border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
    role="region"
    aria-label="Now playing"
    ontouchstart={tstart}
    ontouchmove={tmove}
  >
    <div class="h-0.5 bg-muted"><div class="h-full bg-foreground" style:width="{pct}%"></div></div>
    <div class="flex items-center gap-3 px-3 py-2">
      <button
        class="flex min-w-0 flex-1 items-center gap-3 text-left"
        onclick={() => (player.expanded = true)}
        style:view-transition-name="now-playing-art"
      >
        <Artwork
          coverArt={player.current.coverArt}
          name={player.current.album ?? player.current.title}
          size={120}
          class="h-11 w-11 shrink-0"
        />
        <div class="min-w-0">
          <div class="truncate text-sm font-medium">{player.current.title}</div>
          <div class="truncate text-xs text-muted-foreground">{player.current.artist}</div>
        </div>
      </button>
      <div class="flex items-center gap-1">
        <button
          class="hidden sm:grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
          onclick={() => player.prev()}
          aria-label="Previous"><SkipBack size={18} /></button
        >
        <button
          class="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
          onclick={() => player.toggle()}
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {#if player.playing}<Pause size={20} />{:else}<Play size={20} />{/if}
        </button>
        <button
          class="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
          onclick={() => player.next()}
          aria-label="Next"><SkipForward size={18} /></button
        >
      </div>
    </div>
    {#if player.error}
      <div class="px-3 pb-2 text-xs text-destructive" role="alert">{player.error}</div>
    {/if}
  </div>
{/if}
