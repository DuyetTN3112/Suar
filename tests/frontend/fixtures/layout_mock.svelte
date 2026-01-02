<script lang="ts">
  import type { Snippet } from 'svelte'

  interface Props {
    title?: string
    children?: Snippet
  }

  const { children }: Props = $props()
</script>

<div data-testid="layout-mock">
  {@render children?.()}
</div>
