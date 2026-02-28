import { writable, get } from 'svelte/store'
import axios from 'axios'

// Check if we're in browser (not SSR)
const browser = typeof window !== 'undefined'

export interface Notification {
  id: string
  user_id: string
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

// Raw notification data from API
interface RawNotification {
  id?: string
  user_id?: string
  title?: string
  message?: string
  is_read?: boolean
  type?: string
  related_entity_type?: string | null
  related_entity_id?: string | null
  metadata?: string | null
  created_at?: string
  updated_at?: string
  read_at?: string | null
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
}

function getCsrfToken(): string {
  if (!browser) return ''
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

function createNotificationsStore() {
  const { subscribe, set, update } = writable<NotificationsState>({
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: null,
  })

  return {
    subscribe,

    // Lấy thông báo mới nhất
    fetchLatest: async (limit: number = 10) => {
      update((state) => ({ ...state, loading: true }))

      try {
        const response = await axios.get('/notifications/latest', {
          params: { limit },
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        const notificationsData = response.data.notifications || []
        const unreadCountData = response.data.unread_count || 0

        const processedNotifications: Notification[] = notificationsData.map(
          (notification: RawNotification) => ({
            id: notification.id ?? '',
            user_id: notification.user_id ?? '',
            title: notification.title ?? '',
            message: notification.message ?? '',
            is_read: notification.is_read ?? false,
            type: notification.type ?? 'default',
            related_entity_type: notification.related_entity_type ?? null,
            related_entity_id: notification.related_entity_id ?? null,
            metadata: notification.metadata ?? null,
            created_at: notification.created_at ?? new Date().toISOString(),
            updated_at: notification.updated_at ?? new Date().toISOString(),
            read_at: notification.read_at ?? null,
          })
        )

        update((state) => ({
          ...state,
          notifications: processedNotifications,
          unreadCount: unreadCountData,
          loading: false,
          error: null,
        }))
      } catch (err: unknown) {
        console.error('Lỗi khi tải thông báo:', err)
        const errorMessage = err instanceof Error ? err.message : 'Không thể tải thông báo'
        update((state) => ({
          ...state,
          loading: false,
          error: errorMessage,
        }))
      }
    },

    // Đánh dấu thông báo đã đọc
    markAsRead: async (id: string) => {
      try {
        await axios.post(
          `/notifications/${id}/read`,
          {},
          {
            headers: {
              'X-CSRF-TOKEN': getCsrfToken(),
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        )

        update((state) => ({
          ...state,
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          ),
          unreadCount: Math.max(0, state.unreadCount - 1),
        }))
      } catch (err) {
        console.error('Lỗi khi đánh dấu đã đọc:', err)
      }
    },

    // Đánh dấu tất cả đã đọc
    markAllAsRead: async () => {
      try {
        await axios.post(
          '/notifications/read-all',
          {},
          {
            headers: {
              'X-CSRF-TOKEN': getCsrfToken(),
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }
        )

        update((state) => ({
          ...state,
          notifications: state.notifications.map((n) => ({
            ...n,
            is_read: true,
            read_at: new Date().toISOString(),
          })),
          unreadCount: 0,
        }))
      } catch (err) {
        console.error('Lỗi khi đánh dấu tất cả đã đọc:', err)
      }
    },

    // Xóa thông báo
    deleteNotification: async (id: string) => {
      try {
        await axios.delete(`/notifications/${id}`, {
          headers: {
            'X-CSRF-TOKEN': getCsrfToken(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        })

        update((state) => {
          const notification = state.notifications.find((n) => n.id === id)
          return {
            ...state,
            notifications: state.notifications.filter((n) => n.id !== id),
            unreadCount:
              notification && !notification.is_read
                ? Math.max(0, state.unreadCount - 1)
                : state.unreadCount,
          }
        })
      } catch (err) {
        console.error('Lỗi khi xóa thông báo:', err)
      }
    },
  }
}

export const notificationsStore = createNotificationsStore()

// Hook-like function
export function useNotifications() {
  return notificationsStore
}
