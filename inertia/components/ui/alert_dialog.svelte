<!--
  AlertDialog Component - Svelte 5

  Port từ shadcn/ui React alert-dialog.
  Uses Bits UI AlertDialog primitive.
-->

<script lang="ts" module>
  export { default as AlertDialog } from './alert_dialog.svelte'
  export { default as AlertDialogTrigger } from './alert_dialog_trigger.svelte'
  export { default as AlertDialogContent } from './alert_dialog_content.svelte'
  export { default as AlertDialogHeader } from './alert_dialog_header.svelte'
  export { default as AlertDialogFooter } from './alert_dialog_footer.svelte'
  export { default as AlertDialogTitle } from './alert_dialog_title.svelte'
  export { default as AlertDialogDescription } from './alert_dialog_description.svelte'
  export { default as AlertDialogAction } from './alert_dialog_action.svelte'
  export { default as AlertDialogCancel } from './alert_dialog_cancel.svelte'
</script>

<script lang="ts">
  import { AlertDialog as AlertDialogPrimitive } from 'bits-ui'
  export let open = false
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined
</script>

<AlertDialogPrimitive.Root
  bind:open
  {onOpenChange}
>
  <slot></slot>
</AlertDialogPrimitive.Root>
