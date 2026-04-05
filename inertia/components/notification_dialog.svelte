<script lang="ts">
  import { notificationStore, type NotificationItem } from '@/stores/notification_store.svelte'
  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import Button from '@/components/ui/button.svelte'
  import { CircleCheck, CircleAlert, Info } from 'lucide-svelte'

  const current = $derived(notificationStore.current)

  function getIcon(type: NotificationItem['type']) {
    switch (type) {
      case 'success': return CircleCheck
      case 'error': return CircleAlert
      case 'info': return Info
    }
  }

  function getColorClass(type: NotificationItem['type']) {
    switch (type) {
      case 'success': return 'text-blue-600'
      case 'error': return 'text-red-600'
      case 'info': return 'text-blue-600'
    }
  }

  function getTitle(item: NotificationItem) {
    if (item.message) return item.title
    switch (item.type) {
      case 'success': return 'Thành công'
      case 'error': return 'Lỗi'
      case 'info': return 'Thông báo'
    }
  }

  function handleClose() {
    notificationStore.dismiss(current.id)
  }
</script>

{#if current}
  {@const IconComponent = getIcon(current.type)}
  <AlertDialog open={true} onOpenChange={(open) => { if (!open) handleClose() }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <IconComponent class="h-5 w-5 shrink-0 {getColorClass(current.type)}" />
          <AlertDialogTitle>{current.message ? current.title : getTitle(current)}</AlertDialogTitle>
        </div>
        {#if current.message}
          <AlertDialogDescription>{current.message}</AlertDialogDescription>
        {:else}
          <AlertDialogDescription>{current.title}</AlertDialogDescription>
        {/if}
      </AlertDialogHeader>
      <AlertDialogFooter>
        <Button onclick={handleClose}>Đóng</Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
{/if}
