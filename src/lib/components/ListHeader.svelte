<script lang="ts" generics="K extends string">
  import { Search } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  let { title, count, placeholder, q = $bindable(''), sort = $bindable(), sorts, actions }: {
    title: string; count: number; placeholder: string; q: string; sort: K; sorts: [K, string][]; actions?: Snippet;
  } = $props();
</script>

<div class="mb-4 flex flex-col gap-3">
  <div class="flex items-center justify-between gap-3">
    <h1 class="text-2xl font-semibold tracking-tight">{title} <span class="text-base font-normal text-muted-foreground">{count}</span></h1>
    <div class="flex items-center gap-2">
      {@render actions?.()}
      <div class="relative w-full max-w-56">
        <Search size={14} class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input bind:value={q} {placeholder} autocomplete="off" autocapitalize="off"
          class="h-9 w-full rounded-md border bg-transparent pl-8 pr-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
    </div>
  </div>
  <div class="scroll-x -mx-4 flex gap-1 overflow-x-auto px-4 text-sm md:mx-0 md:px-0">
    {#each sorts as [k, label]}
      <button onclick={() => (sort = k)} class="shrink-0 whitespace-nowrap rounded-md px-2 py-1 {sort === k ? 'bg-accent' : 'text-muted-foreground hover:bg-accent/60'}">{label}</button>
    {/each}
  </div>
</div>