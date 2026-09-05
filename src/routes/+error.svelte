<script lang="ts">
  import { page } from '$app/state';
</script>
<div class="grid min-h-dvh place-items-center p-6 text-center">
  <div class="max-w-sm space-y-3">
    <h1 class="text-xl font-semibold">{page.status === 502 ? "Can't connect to your server" : `Error ${page.status}`}</h1>
    <p class="text-sm text-muted-foreground">{page.error?.message}</p>
    {#if page.error?.code === 'auth'}
      <a href="/login" class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Sign in again</a>
    {:else}
      <button onclick={() => location.reload()} class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Retry</button>
    {/if}
  </div>
</div>
