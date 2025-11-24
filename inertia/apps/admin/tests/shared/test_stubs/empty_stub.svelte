<script lang="ts">
  let { children, } = $props<{ children?: import('svelte').Snippet; [key: string]: unknown }>()
</script>

{#if children}
  {@render children()}
{/if}
