
import { Bell, Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown_menu'
import { useNotifications } from '@/hooks/use_notifications'
import useTranslation from '@/hooks/use_translation'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
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
  const formatTime = (dateString: string) => {
    try {
      // Kiểm tra nếu dateString là null, undefined hoặc rỗng
      if (!dateString) {
        return t('common.unknown_time', {}, 'Không xác định')
      }

      // Thử parse với các định dạng khác nhau
      let date: Date;

      // Nếu là chuỗi ISO, parse trực tiếp
      if (dateString.includes('T') && dateString.includes('Z')) {
        date = new Date(dateString);
      } else {
        // Thử parse với Date constructor
        date = new Date(dateString);

        // Nếu không thành công, thử parse theo định dạng MySQL
        if (isNaN(date.getTime())) {
          // Định dạng: YYYY-MM-DD HH:MM:SS
          const parts = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
          if (parts) {
            const [, year, month, day, hour, minute, second] = parts;
            date = new Date(
              parseInt(year),
              parseInt(month) - 1, // Tháng trong JS bắt đầu từ 0
              parseInt(day),
              parseInt(hour),
              parseInt(minute),
              parseInt(second)
            );
          }
        }
      }

      // Kiểm tra nếu ngày tháng hợp lệ
      if (isNaN(date.getTime())) {
        return t('common.invalid_date', {}, 'Ngày không hợp lệ')
      }

      return format(date, 'dd/MM/yyyy HH:mm', { locale: vi })
    } catch (error) {
      console.error('Lỗi khi định dạng thời gian:', error, dateString)
      return t('common.unknown_time', {}, 'Không xác định')
    }
  }

  // Hiển thị nội dung thông báo
  const renderNotificationContent = (notification: unknown) => {
    // Xử lý các loại thông báo khác nhau
    switch (notification.type) {
      case 'task_assigned':
        return (
          <div>
            <p className="font-medium">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
          </div>
        )
      case 'task_completed':
        return (
          <div>
            <p className="font-medium">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
          </div>
        )
      case 'task_overdue':
        return (
          <div>
            <p className="font-medium text-red-500">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
          </div>
        )
      default:
        return (
          <div>
            <p className="font-medium">{notification.title || t('notifications.no_title', {}, 'Không có tiêu đề')}</p>
            <p className="text-sm text-muted-foreground mt-1">{notification.message || t('notifications.no_message', {}, 'Không có nội dung')}</p>
          </div>
        )
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={`text-muted-foreground relative ${className}`}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{t('notifications.title', {}, 'Thông báo')}</span>
          {unreadCount > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading ? (
          <DropdownMenuItem className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </DropdownMenuItem>
        ) : error ? (
          <DropdownMenuItem className="py-4 text-center text-destructive">
            {error}
          </DropdownMenuItem>
        ) : notifications.length === 0 ? (
          <DropdownMenuItem className="py-6 text-center text-muted-foreground">
            {t('notifications.no_notifications', {}, 'Không có thông báo nào')}
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuGroup className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex flex-col items-start p-4 focus:bg-muted/50 ${
                    notification.is_read ? 'bg-muted/50' : 'bg-background'
                  }`}
                  onSelect={(e) => e.preventDefault()}
                >
                  <div className="w-full">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        {renderNotificationContent(notification)}
                      </div>
                      <div className="flex gap-1 ml-2">
                        {!notification.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              void markAsRead(notification.id);
                            }}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            void deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <div className="flex justify-between p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void markAllAsRead();
                }}
                disabled={unreadCount === 0}
              >
                {t('notifications.mark_all_read', {}, 'Đánh dấu tất cả đã đọc')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  void refresh();
                }}
              >
                {t('common.refresh', {}, 'Làm mới')}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
