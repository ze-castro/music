<script lang="ts">
  import { cn, fallbackGradient } from '$lib/utils';
  let { coverArt, name, size = 300, class: cls = '' }: { coverArt?: string; name: string; size?: number; class?: string } = $props();
  let failed = $state(false);
  let loaded = $state(false);
  const initial = $derived((name?.trim()[0] ?? '?').toUpperCase());
</script>

<div class={cn('relative aspect-square overflow-hidden rounded-md bg-muted', cls)} style:background={!coverArt || failed ? fallbackGradient(name) : undefined}>
  {#if coverArt && !failed}
    <img src={`/api/cover/${coverArt}?size=${size}`} alt="" loading="lazy" decoding="async"
      class="absolute inset-0 h-full w-full object-cover transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'}"
      onload={() => (loaded = true)} onerror={() => (failed = true)} />
  {:else}
    <span class="absolute inset-0 grid place-items-center text-4xl font-semibold text-white/80 select-none">{initial}</span>
  {/if}
</div>
