<!--
  AlertDialogTrigger Component - Svelte 5
-->

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    class?: string
    children?: Snippet
  }

  const { class: className, children, ...restProps }: Props = $props()
</script>

<AlertDialogPrimitive.Trigger
  data-slot="alert-dialog-trigger"
  class={className}
  {...restProps}
>
  {@render children?.()}
</AlertDialogPrimitive.Trigger>
