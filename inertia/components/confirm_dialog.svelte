<script lang="ts">
  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'

  import { cn } from '$lib/utils-svelte'

  let className = ''
  export { className as class }

  export let open = false
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined
  export let title: string
  export let disabled = false
  export let desc: string
  export let cancelBtnText = 'Cancel'
  export let confirmText = 'Continue'
  export let destructive = false
  export let handleConfirm: () => void
  export let isLoading = false
</script>

<AlertDialog bind:open {onOpenChange}>
  <AlertDialogContent class={cn(className)}>
    <AlertDialogHeader class="text-left">
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>
        {desc}
      </AlertDialogDescription>
    </AlertDialogHeader>
    <slot></slot>
    <AlertDialogFooter>
      <AlertDialogCancel disabled={isLoading}>
        {cancelBtnText}
      </AlertDialogCancel>
      <Button
        variant={destructive ? 'destructive' : 'default'}
        onclick={handleConfirm}
        disabled={disabled || isLoading}
      >
        {confirmText}
      </Button>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
