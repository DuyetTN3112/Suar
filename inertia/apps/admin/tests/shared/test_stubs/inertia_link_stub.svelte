<script lang="ts">
  let {
    href = '#',
    children,
    ...attributes
  } = $props<{
    href?: string
    children?: import('svelte').Snippet
    [key: string]: unknown
  }>()
</script>

{#if children}
  <a {href} {...attributes}>
    {@render children()}
  </a>
{/if}
