<script lang="ts">
  import {
    ChevronDown,
    Play,
    Pause,
    SkipForward,
    SkipBack,
    Shuffle,
    Repeat,
    Repeat1,
  } from '@lucide/svelte';
  import { player } from '$lib/stores/player.svelte';
  import { settings } from '$lib/stores/settings.svelte';
  import { fmtTime } from '$lib/utils';
  import Artwork from './Artwork.svelte';
  import LikeButton from './LikeButton.svelte';
  const bitrates = [0, 320, 192, 128, 64];

  // Swipe-down to dismiss. Pointer events cover touch + mouse.
  let dy = $state(0);
  let dragging = $state(false);
  let startY = 0;
  const CLOSE_AT = 120;
  function down(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('input,select,button,a')) return;
    startY = e.clientY;
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (dragging) dy = Math.max(0, e.clientY - startY);
  }
  function up() {
    if (!dragging) return;
    dragging = false;
    if (dy > CLOSE_AT) player.expanded = false;
    dy = 0;
  }
</script>

{#if player.expanded && player.current}
  <div
    class="fixed inset-0 z-50 flex flex-col bg-background pt-safe pb-safe touch-none select-none"
    role="dialog"
    aria-label="Now playing"
    style:transform="translateY({dy}px)"
    style:transition={dragging ? 'none' : 'transform 200ms ease-out'}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
  >
    <div class="mx-auto mt-2 h-1 w-10 rounded-full bg-muted-foreground/40 md:hidden"></div>
    <div class="flex items-center justify-between px-4 py-3">
      <button
        class="grid h-10 w-10 place-items-center rounded-full hover:bg-accent"
        onclick={() => (player.expanded = false)}
        aria-label="Close"><ChevronDown /></button
      >
      <select
        class="rounded-md border bg-transparent px-2 py-1 text-xs"
        value={settings.s.maxBitRate}
        onchange={(e) => player.setBitrate(Number(e.currentTarget.value))}
        aria-label="Quality"
      >
        {#each bitrates as b}<option value={b}>{b === 0 ? 'Original' : `${b} kbps`}</option>{/each}
      </select>
    </div>

    <div class="flex flex-1 flex-col items-center justify-center gap-6 px-8">
      <div class="w-full max-w-sm" style:view-transition-name="now-playing-art">
        <Artwork
          coverArt={player.current.coverArt}
          name={player.current.album ?? player.current.title}
          size={800}
          class="rounded-xl shadow-2xl"
        />
      </div>
      <div class="flex w-full max-w-sm items-center gap-2">
        <div class="min-w-0 flex-1">
          <div class="truncate text-lg font-semibold">{player.current.title}</div>
          {#if player.current.artistId}
            <a
              href="/artists/{player.current.artistId}"
              class="block truncate text-muted-foreground hover:underline"
              onclick={() => (player.expanded = false)}>{player.current.artist}</a
            >
          {:else}
            <div class="truncate text-muted-foreground">{player.current.artist}</div>
          {/if}
        </div>
        <LikeButton track={player.current} size={22} />
      </div>

      <div class="w-full max-w-sm">
        <input
          type="range"
          min="0"
          max={player.duration || 0}
          step="0.5"
          value={player.currentTime}
          oninput={(e) => player.seek(Number(e.currentTarget.value))}
          class="w-full accent-foreground"
          aria-label="Seek"
        />
        <div class="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{fmtTime(player.currentTime)}</span><span
            >-{fmtTime(player.duration - player.currentTime)}</span
          >
        </div>
      </div>

      <div class="flex w-full max-w-sm items-center justify-between">
        <button
          class="grid h-10 w-10 place-items-center rounded-full {player.shuffle
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          onclick={() => (player.shuffle = !player.shuffle)}
          aria-label="Shuffle"
          aria-pressed={player.shuffle}><Shuffle size={20} /></button
        >
        <button
          class="grid h-12 w-12 place-items-center rounded-full hover:bg-accent"
          onclick={() => player.prev()}
          aria-label="Previous"><SkipBack size={28} /></button
        >
        <button
          class="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background"
          onclick={() => player.toggle()}
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {#if player.playing}<Pause size={32} />{:else}<Play size={32} class="ml-1" />{/if}
        </button>
        <button
          class="grid h-12 w-12 place-items-center rounded-full hover:bg-accent"
          onclick={() => player.next()}
          aria-label="Next"><SkipForward size={28} /></button
        >
        <button
          class="grid h-10 w-10 place-items-center rounded-full {player.repeat !== 'off'
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          onclick={() => player.cycleRepeat()}
          aria-label="Repeat: {player.repeat}"
        >
          {#if player.repeat === 'one'}<Repeat1 size={20} />{:else}<Repeat size={20} />{/if}
        </button>
      </div>
    </div>
  </div>
{/if}
