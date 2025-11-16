<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import { format } from 'date-fns'
  import { Bell, Check, LoaderCircle, Trash2 } from 'lucide-svelte'

  import Button from '@/apps/admin/shared/ui/button.svelte'
  import DropdownMenu from '@/apps/admin/shared/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/apps/admin/shared/ui/dropdown_menu_content.svelte'
  import DropdownMenuItem from '@/apps/admin/shared/ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '@/apps/admin/shared/ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '@/apps/admin/shared/ui/dropdown_menu_separator.svelte'
  import DropdownMenuTrigger from '@/apps/admin/shared/ui/dropdown_menu_trigger.svelte'
  import { FRONTEND_NOTIFICATION_TYPES } from '@/apps/admin/modules/notifications/constants/notifications'
  import { dateFnsLocale, dateTimePattern } from '@/apps/admin/shared/lib/date_locale'
  import { postUiTelemetry } from '@/apps/admin/shared/lib/ui_telemetry'
  import { useNotifications } from '@/apps/admin/modules/notifications/stores/notifications.svelte'
  import { useTranslation } from '@/apps/admin/shared/hooks/use_translation.svelte'


  interface NotificationDropdownProps {
    class?: string
  }

  const { class: className = '' }: NotificationDropdownProps = $props()
  let open = $state(false)
  let activeDropdownSessionId = $state<string | null>(null)

  const notificationState = useNotifications()
  const { locale, t } = $derived(useTranslation())

  // Format time with defensive parsing.
  function formatTime(dateString: string): string {
    try {
      if (!dateString) {
        return t('common.unknown_time', {}, 'Unknown time')
      }

      let date: Date

      if (dateString.includes('T') && dateString.includes('Z')) {
        date = new Date(dateString)
      } else {
        date = new Date(dateString)

        if (isNaN(date.getTime())) {
          const parts = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/.exec(dateString)
          if (parts) {
            const [, year, month, day, hour, minute, second] = parts
            if (year && month && day && hour && minute && second) {
              date = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second)
              )
            }
          }
        }
      }

      if (isNaN(date.getTime())) {
        return t('common.invalid_date', {}, 'Invalid date')
      }

      return format(date, dateTimePattern(locale), { locale: dateFnsLocale(locale) })
    } catch (err) {
      console.error('Failed to format notification time:', err, dateString)
      return t('common.unknown_time', {}, 'Unknown time')
    }
  }

  function getNotificationUrl(notification: typeof notificationState.notifications[number]): string | null {
    const entityType = notification.relatedEntityType
    const entityId = notification.relatedEntityId

    if (entityType === 'task' && entityId) {
      return `/tasks/${entityId}`
    }
    if (entityType === 'project' && entityId) {
      return `/projects/${entityId}`
    }
    if (entityType === 'organization' && entityId) {
      return `/organizations`
    }
    if (notification.type.startsWith('task') && entityId) {
      return `/tasks/${entityId}`
    }
    return null
  }

  function handleNotificationClick(notification: typeof notificationState.notifications[number]) {
    const dropdownSessionId = activeDropdownSessionId
    void postUiTelemetry({
      eventName: 'notifications.ui.item_clicked',
      module: 'notifications',
      subsystem: 'notification_dropdown',
      workflow: 'notification_dropdown',
      eventFamily: 'ui',
      surface: 'notification_dropdown',
      frontendSubmissionId: dropdownSessionId,
      targetType: notification.relatedEntityType ?? 'notification',
      targetId: notification.relatedEntityId ?? notification.id,
      metadata: {
        notification_id: notification.id,
        notification_type: notification.type,
        is_read: notification.isRead,
      },
      persist: true,
    }).catch(() => {})
    if (!notification.isRead) {
      void notificationState.markAsRead(notification.id)
    }
    const url = getNotificationUrl(notification)
    if (url) {
      open = false
      router.visit(url)
    }
  }
</script>

<DropdownMenu
  bind:open
  onOpenChange={(nextOpen: boolean) => {
    open = nextOpen
    if (nextOpen) {
      activeDropdownSessionId = crypto.randomUUID()
      void postUiTelemetry({
        eventName: 'notifications.ui.opened',
        module: 'notifications',
        subsystem: 'notification_dropdown',
        workflow: 'notification_dropdown',
        eventFamily: 'ui',
        surface: 'notification_dropdown',
        frontendSubmissionId: activeDropdownSessionId,
        metadata: {
          unread_count: notificationState.unreadCount,
        },
      }).catch(() => {})
      void notificationState.refresh()
    }
  }}
>
  <DropdownMenuTrigger>
    <div class="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground {className}">
      <Bell class="h-5 w-5" />
      {#if notificationState.unreadCount > 0}
        <span class="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
      {/if}
    </div>
  </DropdownMenuTrigger>
  <DropdownMenuContent class="w-80 max-h-[480px] flex flex-col p-0 overflow-hidden" align="end">
    <DropdownMenuLabel class="flex items-center justify-between p-4 pb-2">
      <span>{t('notifications.title', {}, 'Notifications')}</span>
      {#if notificationState.unreadCount > 0}
        <span class="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
          {notificationState.unreadCount}
        </span>
      {/if}
    </DropdownMenuLabel>

    <DropdownMenuSeparator />

    <!-- Scrollable Notification List Container -->
    <div class="flex-1 overflow-y-auto max-h-[280px]">
      {#if notificationState.loading}
        <div class="flex items-center justify-center py-8">
          <LoaderCircle class="h-6 w-6 animate-spin text-primary" />
        </div>
      {:else if notificationState.error}
        <div class="py-6 text-center text-destructive text-sm px-4">
          {notificationState.error}
        </div>
      {:else if notificationState.notifications.length === 0}
        <div class="py-8 text-center text-muted-foreground text-sm px-4">
          {t('notifications.no_notifications', {}, 'No notifications')}
        </div>
      {:else}
        <div class="divide-y divide-border/40">
          {#each notificationState.notifications as notification}
            <DropdownMenuItem
              class="flex flex-col items-start p-4 cursor-pointer focus:bg-muted/50 {notification.isRead ? 'bg-muted/50' : 'bg-background'}"
              onclick={() => { handleNotificationClick(notification) }}
            >
              <div class="w-full">
                <div class="flex justify-between items-start">
                  <div class="flex-1">
                    <!-- Notification content -->
                    {#if notification.type === FRONTEND_NOTIFICATION_TYPES.TASK_OVERDUE}
                      <div>
                        <p class="font-medium text-destructive">{notification.title || t('notifications.no_title', {}, 'No title')}</p>
                        <p class="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'No message')}</p>
                      </div>
                    {:else}
                      <div>
                        <p class="font-medium">{notification.title || t('notifications.no_title', {}, 'No title')}</p>
                        <p class="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'No message')}</p>
                      </div>
                    {/if}
                  </div>
                  <div class="flex gap-1 ml-2">
                    {#if !notification.isRead}
                        <Button
                          variant="ghost"
                          size="icon"
                          class="h-6 w-6"
                          onclick={(e: MouseEvent) => {
                            e.stopPropagation()
                            void postUiTelemetry({
                              eventName: 'notifications.ui.marked_read',
                              module: 'notifications',
                              subsystem: 'notification_dropdown',
                              workflow: 'notification_dropdown',
                              eventFamily: 'ui',
                              surface: 'notification_dropdown',
                              frontendSubmissionId: activeDropdownSessionId,
                              targetType: 'notification',
                              targetId: notification.id,
                              metadata: {
                                notification_type: notification.type,
                              },
                              persist: true,
                            }).catch(() => {})
                            void notificationState.markAsRead(notification.id)
                          }}
                        >
                        <Check class="h-3 w-3" />
                      </Button>
                    {/if}
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6"
                      onclick={(e: MouseEvent) => {
                        e.stopPropagation()
                        void notificationState.deleteNotification(notification.id)
                      }}
                    >
                      <Trash2 class="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div class="text-xs text-muted-foreground mt-2">
                  {formatTime(notification.createdAt)}
                </div>
              </div>
            </DropdownMenuItem>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Actions / View All Footer (always visible unless loading or error) -->
    {#if !notificationState.loading && !notificationState.error}
      <DropdownMenuSeparator />

      <div class="flex justify-between p-2 bg-muted/10">
        <Button
          variant="ghost"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            void postUiTelemetry({
              eventName: 'notifications.ui.marked_all_read',
              module: 'notifications',
              subsystem: 'notification_dropdown',
              workflow: 'notification_dropdown',
              eventFamily: 'ui',
              surface: 'notification_dropdown',
              frontendSubmissionId: activeDropdownSessionId,
              metadata: {
                unread_count: notificationState.unreadCount,
              },
              persist: true,
            }).catch(() => {})
            void notificationState.markAllAsRead()
          }}
          disabled={notificationState.unreadCount === 0}
        >
          {t('notifications.mark_all_read', {}, 'Mark all as read')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            void postUiTelemetry({
              eventName: 'notifications.ui.refreshed',
              module: 'notifications',
              subsystem: 'notification_dropdown',
              workflow: 'notification_dropdown',
              eventFamily: 'ui',
              surface: 'notification_dropdown',
              frontendSubmissionId: activeDropdownSessionId,
            }).catch(() => {})
            void notificationState.refresh()
          }}
        >
          {t('common.refresh', {}, 'Refresh')}
        </Button>
      </div>

      <DropdownMenuSeparator />
      <div class="p-2 text-center bg-accent/40 border-t border-border">
        <Link
          href="/notifications"
          class="inline-flex w-full items-center justify-center text-xs font-bold text-primary hover:underline py-1.5"
          onclick={() => { open = false }}
        >
          {t('notifications.view_all', {}, 'View all notifications')} →
        </Link>
      </div>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
