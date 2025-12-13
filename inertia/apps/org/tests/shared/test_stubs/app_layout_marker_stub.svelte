<script lang="ts">
  import type { Snippet } from "svelte"
  let { children }: { children?: Snippet } = $props()
</script>
<div data-testid="app-layout-marker">
  {#if children}
    {@render children()}
  {/if}
</div>
