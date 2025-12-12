<script lang="ts">
  let { children, } = $props<{ children?: import('svelte').Snippet; [key: string]: unknown }>()
</script>
<div data-testid="project-sprint-controls">
  {#if children}
    {@render children()}
  {/if}
</div>