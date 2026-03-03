<script lang="ts">
  let { href = '', children } = $props<{ href?: string; children?: import('svelte').Snippet; [key: string]: unknown }>()
</script>

<a {href}>
  {#if children}
    {@render children()}
  {/if}
</a>
