<!--
  DialogTrigger Component - Svelte 5
-->

<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<DialogPrimitive.Trigger
  data-slot="dialog-trigger"
  class={className}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Trigger>
