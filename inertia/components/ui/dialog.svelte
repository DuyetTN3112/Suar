<!--
  Dialog Component - Svelte 5

  Port từ shadcn/ui React dialog.
  Uses Bits UI Dialog primitive.
-->

<script lang="ts" module>
  export { default as Dialog } from './dialog.svelte'
  export { default as DialogTrigger } from './dialog_trigger.svelte'
  export { default as DialogContent } from './dialog_content.svelte'
  export { default as DialogHeader } from './dialog_header.svelte'
  export { default as DialogFooter } from './dialog_footer.svelte'
  export { default as DialogTitle } from './dialog_title.svelte'
  export { default as DialogDescription } from './dialog_description.svelte'
  export { default as DialogClose } from './dialog_close.svelte'
</script>

<script lang="ts">
  import { Dialog as DialogPrimitive } from 'bits-ui'
  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    children?: Snippet
  }

  let {
    open = $bindable(false),
    onOpenChange,
    children,
    ...restProps
  }: Props = $props()

  // Handler để sync state khi bits-ui thay đổi
  function handleOpenChange(value: boolean) {
    open = value
    onOpenChange?.(value)
  }
</script>

<DialogPrimitive.Root
  open={open}
  onOpenChange={handleOpenChange}
  {...restProps}
>
  {@render children?.()}
</DialogPrimitive.Root>
