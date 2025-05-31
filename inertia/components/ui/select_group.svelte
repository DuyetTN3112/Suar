<!--
  SelectGroup Component - Svelte 5
-->

<script lang="ts">
  import { Select as SelectPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<SelectPrimitive.Group
  data-slot="select-group"
  class={className}
  {...restProps}
>
  {@render children?.()}
</SelectPrimitive.Group>
