import { useState, useEffect } from 'react'
import axios from 'axios'

export interface Notification {
  id: number
  user_id: number
  title: string
  message: string
  is_read: boolean
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lấy CSRF token từ meta tag
  const getCsrfToken = () => {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
  }

  // Lấy thông báo mới nhất
  const fetchLatestNotifications = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/notifications/latest', {
        params: { limit: 10 }, // Tăng limit để lấy nhiều thông báo hơn
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      // Xử lý dữ liệu từ API
      const notificationsData = response.data.notifications || []
      const unreadCountData = response.data.unread_count || 0

      // Đảm bảo định dạng ngày tháng hợp lệ và giữ nguyên cấu trúc dữ liệu
      const processedNotifications = notificationsData.map((notification: unknown) => {
        // Đảm bảo các trường bắt buộc có giá trị
        return {
          id: notification.id || 0,
          user_id: notification.user_id || 0,
          title: notification.title || '',
          message: notification.message || '',
          is_read: notification.is_read || false,
          type: notification.type || 'default',
          related_entity_type: notification.related_entity_type || null,
          related_entity_id: notification.related_entity_id || null,
          metadata: notification.metadata || null,
          created_at: notification.created_at || new Date().toISOString(),
          updated_at: notification.updated_at || new Date().toISOString(),
          read_at: notification.read_at || null,
        }
      })

      setNotifications(processedNotifications)
      setUnreadCount(unreadCountData)
      setError(null)
    } catch (err: unknown) {
      console.error('Lỗi khi tải thông báo:', err)
      setError(err.response?.data?.error || 'Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }

  // Đánh dấu thông báo đã đọc
  const markAsRead = async (id: number) => {
    try {
      await axios.post(
        `/notifications/${id}/mark-as-read`,
        {},
        {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )

      // Cập nhật trạng thái trong state local, giữ nguyên tất cả dữ liệu khác
      setNotifications(
        notifications.map((notification) => {
          if (notification.id === id) {
            return {
              ...notification,
              is_read: true,
              read_at: new Date().toISOString(),
            }
          }
          return notification
        })
      )

      // Giảm số lượng thông báo chưa đọc
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Lỗi khi đánh dấu thông báo đã đọc:', err)
    }
  }

  // Đánh dấu tất cả thông báo đã đọc
  const markAllAsRead = async () => {
    try {
      await axios.post(
        '/notifications/mark-all-as-read',
        {},
        {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      )

      // Cập nhật trạng thái trong state local, giữ nguyên tất cả dữ liệu khác
      const now = new Date().toISOString()
      setNotifications(
        notifications.map((notification) => ({
          ...notification,
          is_read: true,
          read_at: notification.read_at || now,
        }))
      )
      setUnreadCount(0)
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả thông báo đã đọc:', err)
    }
  }

  // Xóa thông báo
  const deleteNotification = async (id: number) => {
    try {
      await axios.delete(`/notifications/${id}`, {
        headers: {
          'X-CSRF-TOKEN': getCsrfToken(),
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      // Xóa thông báo khỏi state local
      const newNotifications = notifications.filter((notification) => notification.id !== id)
      setNotifications(newNotifications)

      // Cập nhật số lượng thông báo chưa đọc nếu cần
      const deletedNotification = notifications.find((n) => n.id === id)
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Lỗi khi xóa thông báo:', err)
    }
  }

  // Tải thông báo khi component mount
  useEffect(() => {
    void fetchLatestNotifications()
  }, [])

  // Polling để kiểm tra thông báo mới mỗi 30 giây
  useEffect(() => {
    const interval = setInterval(() => {
      void fetchLatestNotifications()
    }, 30000) // 30 giây

    return () => clearInterval(interval)
  }, [])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh: fetchLatestNotifications,
  }
}
