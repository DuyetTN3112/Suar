<script lang="ts">
  import { Bell, Check, Trash2 } from 'lucide-svelte'
  import Button from '@/components/ui/button.svelte'
  import DropdownMenu from '@/components/ui/dropdown_menu.svelte'
  import DropdownMenuContent from '@/components/ui/dropdown_menu_content.svelte'
  import DropdownMenuGroup from '@/components/ui/dropdown_menu_group.svelte'
  import DropdownMenuItem from '@/components/ui/dropdown_menu_item.svelte'
  import DropdownMenuLabel from '@/components/ui/dropdown_menu_label.svelte'
  import DropdownMenuSeparator from '@/components/ui/dropdown_menu_separator.svelte'
  import DropdownMenuTrigger from '@/components/ui/dropdown_menu_trigger.svelte'
  import { useNotifications } from '@/stores/notifications.svelte'
  import { useTranslation } from '@/stores/translation.svelte'
  import { format } from 'date-fns'
  import { vi } from 'date-fns/locale'

  interface NotificationDropdownProps {
    class?: string
  }

  const { class: className = '' }: NotificationDropdownProps = $props()

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh
  } = useNotifications()
  const { t } = useTranslation()

  // Định dạng thời gian với xử lý lỗi nâng cao
  function formatTime(dateString: string): string {
    try {
      // Kiểm tra nếu dateString là null, undefined hoặc rỗng
      if (!dateString) {
        return t('common.unknown_time', {}, 'Không xác định')
      }

      // Thử parse với các định dạng khác nhau
      let date: Date

      // Nếu là chuỗi ISO, parse trực tiếp
      if (dateString.includes('T') && dateString.includes('Z')) {
        date = new Date(dateString)
      } else {
        // Thử parse với Date constructor
        date = new Date(dateString)

        // Nếu không thành công, thử parse theo định dạng MySQL
        if (isNaN(date.getTime())) {
          // Định dạng: YYYY-MM-DD HH:MM:SS
          const parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
          if (parts) {
            const [, year, month, day, hour, minute, second] = parts
            date = new Date(
              parseInt(year),
              parseInt(month) - 1, // Tháng trong JS bắt đầu từ 0
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            )
          }
        }
      }

      // Kiểm tra nếu ngày tháng hợp lệ
      if (isNaN(date.getTime())) {
        return t('common.invalid_date', {}, 'Ngày không hợp lệ')
      }

      return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
    } catch (err) {
      console.error('Lỗi khi định dạng thời gian:', err, dateString)
      return t('common.unknown_time', {}, 'Không xác định')
    }
  }
</script>

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost" size="icon" class="text-muted-foreground relative {className}">
      <Bell class="h-5 w-5" />
      {#if unreadCount > 0}
        <span class="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
      {/if}
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent class="w-80" align="end">
    <DropdownMenuLabel class="flex items-center justify-between">
      <span>{t('notifications.title', {}, 'Thông báo')}</span>
      {#if unreadCount > 0}
        <span class="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
          {unreadCount}
        </span>
      {/if}
    </DropdownMenuLabel>

    <DropdownMenuSeparator />

    {#if loading}
      <DropdownMenuItem class="flex items-center justify-center py-6">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </DropdownMenuItem>
    {:else if error}
      <DropdownMenuItem class="py-4 text-center text-destructive">
        {error}
      </DropdownMenuItem>
    {:else if notifications.length === 0}
      <DropdownMenuItem class="py-6 text-center text-muted-foreground">
        {t('notifications.no_notifications', {}, 'Không có thông báo nào')}
      </DropdownMenuItem>
    {:else}
      <DropdownMenuGroup class="max-h-96 overflow-y-auto">
        {#each notifications as notification}
          <DropdownMenuItem
            class="flex flex-col items-start p-4 focus:bg-muted/50 {notification.is_read ? 'bg-muted/50' : 'bg-background'}"
            onclick={(e: MouseEvent) => { e.preventDefault() }}
          >
            <div class="w-full">
              <div class="flex justify-between items-start">
                <div class="flex-1">
                  <!-- Hiển thị nội dung thông báo -->
                  {#if notification.type === 'task_overdue'}
                    <div>
                      <p class="font-medium text-red-500">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
                      <p class="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
                    </div>
                  {:else}
                    <div>
                      <p class="font-medium">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
                      <p class="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
                    </div>
                  {/if}
                </div>
                <div class="flex gap-1 ml-2">
                  {#if !notification.is_read}
                    <Button
                      variant="ghost"
                      size="icon"
                      class="h-6 w-6"
                      onclick={(e: MouseEvent) => {
                        e.stopPropagation()
                        void markAsRead(notification.id)
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
                      void deleteNotification(notification.id)
                    }}
                  >
                    <Trash2 class="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div class="text-xs text-muted-foreground mt-2">
                {formatTime(notification.created_at)}
              </div>
            </div>
          </DropdownMenuItem>
        {/each}
      </DropdownMenuGroup>

      <DropdownMenuSeparator />

      <div class="flex justify-between p-2">
        <Button
          variant="ghost"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            void markAllAsRead()
          }}
          disabled={unreadCount === 0}
        >
          {t('notifications.mark_all_read', {}, 'Đánh dấu tất cả đã đọc')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onclick={(e: MouseEvent) => {
            e.stopPropagation()
            void refresh()
          }}
        >
          {t('common.refresh', {}, 'Làm mới')}
        </Button>
      </div>
    {/if}
  </DropdownMenuContent>
</DropdownMenu>
