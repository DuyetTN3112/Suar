<script lang="ts">
  import type { Snippet } from "svelte"
  let { children }: { children?: Snippet } = $props()
</script>
<div data-testid="organization-layout-marker">
  {#if children}
    {@render children()}
  {/if}
</div>
