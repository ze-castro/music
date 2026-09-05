<script lang="ts">
  import { Play, Pause, SkipForward, SkipBack } from '@lucide/svelte';
  import { player } from '$lib/stores/player.svelte';
  import Artwork from './Artwork.svelte';
  // floating = mobile pill (matches tab bar); docked = desktop full-width bar
  let { floating = false }: { floating?: boolean } = $props();
  const pct = $derived(player.duration ? (player.currentTime / player.duration) * 100 : 0);
  // progress ring: r=19 → circumference ≈ 119.4
  const C = 2 * Math.PI * 19;
  const dash = $derived(C * (1 - pct / 100));
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
  {#if floating}
    <div
      class="flex items-center gap-2 rounded-full border bg-card/80 p-1 pr-1.5 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/70"
      role="region"
      aria-label="Now playing"
      ontouchstart={tstart}
      ontouchmove={tmove}
    >
      <button
        class="flex min-w-0 flex-1 items-center gap-3 text-left"
        onclick={() => (player.expanded = true)}
        style:view-transition-name="now-playing-art"
      >
        <Artwork
          coverArt={player.current.coverArt}
          name={player.current.album ?? player.current.title}
          size={120}
          class="h-11 w-11 shrink-0 rounded-full"
        />
        <div class="min-w-0">
          <div class="truncate text-sm font-medium leading-tight">{player.current.title}</div>
          <div class="truncate text-xs text-muted-foreground">{player.current.artist}</div>
        </div>
      </button>

      <!-- play/pause with progress ring -->
      <button
        class="relative grid h-11 w-11 shrink-0 place-items-center"
        onclick={() => player.toggle()}
        aria-label={player.playing ? 'Pause' : 'Play'}
      >
        <svg class="absolute inset-0 -rotate-90" viewBox="0 0 44 44" aria-hidden="true">
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            class="text-muted"
          />
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            class="text-foreground transition-[stroke-dashoffset] duration-300"
            stroke-dasharray={C}
            stroke-dashoffset={dash}
          />
        </svg>
        <span class="grid h-8 w-8 place-items-center rounded-full bg-foreground text-background">
          {#if player.playing}<Pause size={15} />{:else}<Play size={15} class="ml-0.5" />{/if}
        </span>
      </button>
      <button
        class="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted-foreground active:bg-accent"
        onclick={() => player.next()}
        aria-label="Next"><SkipForward size={20} /></button
      >
    </div>
    {#if player.error}
      <div
        class="mt-1 rounded-full border border-destructive/40 bg-card/80 px-3 py-1 text-center text-xs text-destructive backdrop-blur-xl"
        role="alert"
      >
        {player.error}
      </div>
    {/if}
  {:else}
    <div
      class="border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      role="region"
      aria-label="Now playing"
    >
      <div class="h-0.5 bg-muted">
        <div class="h-full bg-foreground" style:width="{pct}%"></div>
      </div>
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
            class="grid h-9 w-9 place-items-center rounded-full hover:bg-accent"
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
{/if}
