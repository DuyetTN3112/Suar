<script lang="ts">
  import type { Snippet } from 'svelte'

  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'

  import { cn } from '$lib/utils-svelte'

  interface Props {
    class?: string
    open: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    disabled?: boolean
    desc: string
    cancelBtnText?: string
    confirmText?: string
    destructive?: boolean
    handleConfirm: () => void
    isLoading?: boolean
    children?: Snippet
  }

  let {
    class: className = '',
    open = $bindable(false),
    onOpenChange,
    title,
    disabled = false,
    desc,
    cancelBtnText = 'Cancel',
    confirmText = 'Continue',
    destructive = false,
    handleConfirm,
    isLoading = false,
    children,
  }: Props = $props()
</script>

<AlertDialog bind:open {onOpenChange}>
  <AlertDialogContent class={cn(className)}>
    <AlertDialogHeader class="text-left">
      <AlertDialogTitle>{title}</AlertDialogTitle>
      <AlertDialogDescription>
        {desc}
      </AlertDialogDescription>
    </AlertDialogHeader>
    {@render children?.()}
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
