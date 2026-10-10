<script lang="ts">
  import { cn, fallbackGradient } from '$lib/utils';
  // lazy=false for art that is always on screen and changes in place (the player).
  let { coverArt, name, size = 300, lazy = true, class: cls = '' }: { coverArt?: string; name: string; size?: number; lazy?: boolean; class?: string } = $props();
  const src = $derived(coverArt ? `/api/cover/${coverArt}?size=${size}` : null);
  // Remembered per URL, so one cover's outcome never carries over to the next.
  let loadedSrc = $state<string | null>(null);
  let failedSrc = $state<string | null>(null);
  const show = $derived(src !== null && failedSrc !== src);
  const initial = $derived((name?.trim()[0] ?? '?').toUpperCase());
  // Already decoded (e.g. warmed by the player's prefetch): show at once, skip the fade.
  function settle(img: HTMLImageElement) {
    if (img.complete && img.naturalWidth > 0) loadedSrc = img.getAttribute('src');
  }
</script>

<div class={cn('relative aspect-square overflow-hidden rounded-md bg-muted', cls)} style:background={show ? undefined : fallbackGradient(name)}>
  {#if show}
    <!-- Keyed: a new cover gets a new <img>, so the old picture can't stay up while (or if) the next one loads. -->
    {#key src}
      <img {src} alt="" loading={lazy ? 'lazy' : 'eager'} decoding="async" use:settle
        class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 {loadedSrc === src ? 'opacity-100' : 'opacity-0'}"
        onload={(e) => (loadedSrc = e.currentTarget.getAttribute('src'))}
        onerror={(e) => (failedSrc = e.currentTarget.getAttribute('src'))} />
    {/key}
  {:else}
    <span class="absolute inset-0 grid place-items-center text-4xl font-semibold text-white/80 select-none">{initial}</span>
  {/if}
</div>
