<script lang="ts">
  import { cn } from '$lib/utils-svelte'
  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogCancel from '@/components/ui/alert_dialog_cancel.svelte'
  import Button from '@/components/ui/button.svelte'
  import type { Snippet } from 'svelte'

  type Props = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    title: string
    disabled?: boolean
    desc: string
    cancelBtnText?: string
    confirmText?: string
    destructive?: boolean
    handleConfirm: () => void
    isLoading?: boolean
    class?: string
    children?: Snippet
  }

  let {
    open = $bindable(false),
    onOpenChange,
    title,
    desc,
    children,
    class: className,
    confirmText = 'Continue',
    cancelBtnText = 'Cancel',
    destructive = false,
    isLoading = false,
    disabled = false,
    handleConfirm
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
    {#if children}
      {@render children()}
    {/if}
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
