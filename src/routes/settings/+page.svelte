<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { settings } from '$lib/stores/settings.svelte';
  import { player } from '$lib/stores/player.svelte';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
  const bitrates = [[0, 'Original'], [320, '320 kbps'], [192, '192 kbps'], [128, '128 kbps'], [64, '64 kbps']] as const;

  // svelte-ignore state_referenced_locally
  let scanning = $state(data.library.scanning);
  async function rescan() {
    scanning = true;
    await fetch('/api/settings/scan', { method: 'POST' });
    const poll = setInterval(async () => {
      const s = await (await fetch('/api/settings/scan')).json();
      if (!s.scanning) { clearInterval(poll); scanning = false; invalidateAll(); }
    }, 2000);
  }
  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString() : '—');
</script>

<svelte:head><title>Settings · Music</title></svelte:head>

<div class="mx-auto max-w-2xl p-4 md:p-6">
  <h1 class="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>

  <section class="mb-8">
    <h2 class="mb-2 text-sm font-medium text-muted-foreground">Account</h2>
    <div class="divide-y rounded-lg border">
      <div class="flex items-center justify-between px-4 py-3"><span>Signed in as</span><span class="font-medium">{data.account.username}</span></div>
      <div class="flex items-center justify-between gap-4 px-4 py-3"><span>Server</span><span class="truncate text-muted-foreground">{data.account.serverUrl}</span></div>
      <form method="POST" action="/logout" class="px-4 py-3"><button class="text-destructive">Sign out</button></form>
    </div>
  </section>

  <section class="mb-8">
    <h2 class="mb-2 text-sm font-medium text-muted-foreground">Playback</h2>
    <div class="divide-y rounded-lg border">
      <label class="flex items-center justify-between px-4 py-3">
        <span>Appearance</span>
        <select class="rounded-md border bg-transparent px-2 py-1 text-sm" value={settings.s.theme} onchange={(e) => settings.set('theme', e.currentTarget.value as 'dark' | 'light')}>
          <option value="dark">Dark</option><option value="light">Light</option>
        </select>
      </label>
      <label class="flex items-center justify-between px-4 py-3">
        <span>Gapless playback<span class="block text-xs text-muted-foreground">Preload next song</span></span>
        <input type="checkbox" class="h-5 w-5 accent-foreground" checked={settings.s.gapless} onchange={(e) => settings.set('gapless', e.currentTarget.checked)} />
      </label>
      <label class="flex items-center justify-between px-4 py-3">
        <span>Streaming quality<span class="block text-xs text-muted-foreground">Lower saves data on mobile</span></span>
        <select class="rounded-md border bg-transparent px-2 py-1 text-sm" value={settings.s.maxBitRate} onchange={(e) => player.setBitrate(Number(e.currentTarget.value))}>
          {#each bitrates as [v, label]}<option value={v}>{label}</option>{/each}
        </select>
      </label>
    </div>
  </section>

  <section>
    <h2 class="mb-2 text-sm font-medium text-muted-foreground">Library</h2>
    <div class="divide-y rounded-lg border">
      <div class="flex items-center justify-between px-4 py-3"><span>Songs</span><span class="tabular-nums">{data.library.songs ?? '—'}</span></div>
      <div class="flex items-center justify-between px-4 py-3"><span>Albums</span><span class="tabular-nums">{data.library.albums}</span></div>
      <div class="flex items-center justify-between px-4 py-3"><span>Artists</span><span class="tabular-nums">{data.library.artists}</span></div>
      <div class="flex items-center justify-between px-4 py-3"><span>Playlists</span><span class="tabular-nums">{data.library.playlists}</span></div>
      <div class="flex items-center justify-between px-4 py-3"><span>Last scan</span><span class="text-muted-foreground">{fmtDate(data.library.lastScan)}</span></div>
      <div class="flex items-center justify-between px-4 py-3">
        <span>Rescan library<span class="block text-xs text-muted-foreground">Runs Navidrome's scanner</span></span>
        <button onclick={rescan} disabled={scanning} class="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50">{scanning ? 'Scanning…' : 'Rescan'}</button>
      </div>
    </div>
  </section>
</div>