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
    LoaderCircle,
  } from '@lucide/svelte';
  import { player, ART } from '$lib/stores/player.svelte';
  import { fmtTime } from '$lib/utils';
  import Artwork from './Artwork.svelte';
  import LikeButton from './LikeButton.svelte';

  import { slideUp } from '$lib/motion';

  // Swipe-down to dismiss. Pointer events cover touch + mouse.
  let dy = $state(0);
  let dragging = $state(false);
  let startY = 0;
  const CLOSE_AT = 120;
  // A downward flick faster than this (px/ms) closes even before CLOSE_AT.
  const FLICK = 0.11;
  // Pointer positions from the last 100 ms, for the release speed.
  let samples: { y: number; t: number }[] = [];
  function down(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('input,select,button,a')) return;
    startY = e.clientY;
    samples = [{ y: e.clientY, t: e.timeStamp }];
    dragging = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    dy = Math.max(0, e.clientY - startY);
    samples.push({ y: e.clientY, t: e.timeStamp });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
  }
  function up(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    // Measure up to the release, so dragging then holding still doesn't count as a flick.
    samples.push({ y: e.clientY, t: e.timeStamp });
    while (samples.length > 2 && e.timeStamp - samples[0].t > 100) samples.shift();
    const a = samples[0];
    const b = samples[samples.length - 1];
    const speed = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0;
    // Closing keeps dy: the slide-out continues from where the finger let go.
    if (dy > CLOSE_AT || (dy > 10 && speed > FLICK)) player.expanded = false;
    else dy = 0;
  }

  // Escape closes at once: keyboard actions shouldn't wait on an animation.
  let instant = $state(false);
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') instant = true;
  }

  // Seek-bar position while dragging. Seeking only on release: every seek restarts the stream.
  let scrub = $state<number | null>(null);
  const shownTime = $derived(scrub ?? player.currentTime);
</script>

<svelte:window onkeydown={onKey} />

{#if player.expanded && player.current}
  <div
    class="fixed inset-0 z-50 flex flex-col overflow-hidden bg-background pt-safe pb-safe touch-none select-none"
    role="dialog"
    tabindex="-1"
    aria-label="Now playing"
    in:slideUp={{ duration: 400 }}
    out:slideUp={{ duration: 300, instant }}
    onoutroend={() => {
      dy = 0;
      instant = false;
    }}
    onintrostart={() => (instant = false)}
    style:transform="translateY({dy}px)"
    style:transition={dragging ? 'none' : 'transform 200ms var(--ease-out)'}
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
    </div>

    <div
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto px-8 pb-4 sm:gap-5"
    >
      <div class="w-[min(100%,24rem,42svh)] min-w-[10rem] shrink-0">
        <Artwork
          coverArt={player.current.coverArt}
          name={player.current.album ?? player.current.title}
          size={ART.full}
          lazy={false}
          class="rounded-xl shadow-2xl"
        />
      </div>
      <div class="flex w-full max-w-sm shrink-0 items-center gap-2">
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

      <div class="w-full max-w-sm shrink-0">
        <input
          type="range"
          min="0"
          max={player.duration || 0}
          step="0.5"
          value={shownTime}
          oninput={(e) => (scrub = Number(e.currentTarget.value))}
          onchange={(e) => {
            player.seek(Number(e.currentTarget.value));
            scrub = null;
          }}
          onblur={() => (scrub = null)}
          class="w-full accent-foreground"
          aria-label="Seek"
        />
        <div class="flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{fmtTime(shownTime)}</span><span>-{fmtTime(player.duration - shownTime)}</span
          >
        </div>
      </div>

      <div class="flex w-full max-w-sm shrink-0 items-center justify-between">
        <button
          class="grid h-10 w-10 place-items-center rounded-full transition-transform duration-160 ease-out active:scale-95 motion-reduce:active:scale-[0.98] {player.shuffle
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          onclick={() => (player.shuffle = !player.shuffle)}
          aria-label="Shuffle"
          aria-pressed={player.shuffle}><Shuffle size={20} /></button
        >
        <button
          class="grid h-12 w-12 place-items-center rounded-full hover:bg-accent transition-transform duration-160 ease-out active:scale-95 motion-reduce:active:scale-[0.98]"
          onclick={() => player.prev()}
          aria-label="Previous"><SkipBack size={28} /></button
        >
        <button
          class="grid h-16 w-16 place-items-center rounded-full bg-foreground text-background transition-transform duration-160 ease-out active:scale-95 motion-reduce:active:scale-[0.98]"
          onclick={() => player.toggle()}
          aria-label={player.playing ? 'Pause' : 'Play'}
        >
          {#if player.buffering}<LoaderCircle size={32} class="animate-spin" />{:else if player.playing}<Pause
              size={32}
            />{:else}<Play size={32} class="ml-1" />{/if}
        </button>
        <button
          class="grid h-12 w-12 place-items-center rounded-full hover:bg-accent transition-transform duration-160 ease-out active:scale-95 motion-reduce:active:scale-[0.98]"
          onclick={() => player.next()}
          aria-label="Next"><SkipForward size={28} /></button
        >
        <button
          class="grid h-10 w-10 place-items-center rounded-full transition-transform duration-160 ease-out active:scale-95 motion-reduce:active:scale-[0.98] {player.repeat !== 'off'
            ? 'text-foreground'
            : 'text-muted-foreground'}"
          onclick={() => player.cycleRepeat()}
          aria-label="Repeat: {player.repeat}"
        >
          {#if player.repeat === 'one'}<Repeat1 size={20} />{:else}<Repeat size={20} />{/if}
        </button>
      </div>
      {#if player.error}
        <div class="w-full max-w-sm shrink-0 text-center text-xs text-destructive" role="alert">
          {player.error}
        </div>
      {/if}
    </div>
  </div>
{/if}
