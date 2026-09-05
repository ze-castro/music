<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, PageData } from './$types';
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let busy = $state(false);
</script>

<svelte:head><title>Sign in · Music</title></svelte:head>

<main class="min-h-dvh flex items-center justify-center p-6 pt-safe pb-safe">
  <form method="POST" class="w-full max-w-sm space-y-4"
    use:enhance={() => { busy = true; return async ({ update }) => { busy = false; await update(); }; }}>
    <h1 class="text-2xl font-semibold tracking-tight">Music</h1>
    <p class="text-sm text-muted-foreground">Sign in with your Navidrome account.</p>

    {#if !data.pinnedServer}
      <label class="block space-y-1.5">
        <span class="text-sm font-medium">Server</span>
        <input name="server" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false"
          required placeholder="https://music.example.com" value={form?.serverUrl ?? ''}
          class="w-full h-10 rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </label>
    {/if}
    <label class="block space-y-1.5">
      <span class="text-sm font-medium">Username</span>
      <input name="username" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="username"
        required value={form?.username ?? ''}
        class="w-full h-10 rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>
    <label class="block space-y-1.5">
      <span class="text-sm font-medium">Password</span>
      <input name="password" type="password" autocomplete="current-password" required
        class="w-full h-10 rounded-md border bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </label>

    {#if form?.error}
      <p class="text-sm text-destructive" role="alert">{form.error}</p>
    {/if}

    <button type="submit" disabled={busy}
      class="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50">
      {busy ? 'Checking server…' : 'Sign in'}
    </button>
  </form>
</main>
