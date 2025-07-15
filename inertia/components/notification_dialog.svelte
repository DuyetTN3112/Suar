<script lang="ts">
  import { CircleCheck, CircleAlert, Info } from 'lucide-svelte'

  import AlertDialog from '@/components/ui/alert_dialog.svelte'
  import AlertDialogContent from '@/components/ui/alert_dialog_content.svelte'
  import AlertDialogDescription from '@/components/ui/alert_dialog_description.svelte'
  import AlertDialogFooter from '@/components/ui/alert_dialog_footer.svelte'
  import AlertDialogHeader from '@/components/ui/alert_dialog_header.svelte'
  import AlertDialogTitle from '@/components/ui/alert_dialog_title.svelte'
  import Button from '@/components/ui/button.svelte'
  import { FRONTEND_DIALOG_NOTIFICATION_TYPES } from '@/constants/notifications'
  import { notificationStore, type NotificationItem } from '@/stores/notification_store.svelte'

  const current = $derived(notificationStore.current)

  function getIcon(type: NotificationItem['type']) {
    switch (type) {
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.SUCCESS: return CircleCheck
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.ERROR: return CircleAlert
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.INFO: return Info
    }
  }

  function getColorClass(type: NotificationItem['type']) {
    switch (type) {
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.SUCCESS: return 'text-blue-600'
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.ERROR: return 'text-red-600'
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.INFO: return 'text-blue-600'
    }
  }

  function getTitle(item: NotificationItem) {
    if (item.message) return item.title
    switch (item.type) {
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.SUCCESS: return 'Thành công'
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.ERROR: return 'Lỗi'
      case FRONTEND_DIALOG_NOTIFICATION_TYPES.INFO: return 'Thông báo'
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
