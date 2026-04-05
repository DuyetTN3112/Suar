import axios from 'axios'
import {
  FRONTEND_NOTIFICATION_TYPES,
  type FrontendNotificationType,
} from '@/constants/notifications'

const browser = typeof window !== 'undefined'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  type: FrontendNotificationType
  related_entity_type: string | null
  related_entity_id: string | null
  metadata: string | null
  read_at: string | null
  created_at: string
  updated_at: string
}

interface RawNotification {
  id?: string
  user_id?: string
  title?: string
  message?: string
  is_read?: boolean
  type?: FrontendNotificationType
  related_entity_type?: string | null
  related_entity_id?: string | null
  metadata?: string | null
  created_at?: string
  updated_at?: string
  read_at?: string | null
}

interface LatestNotificationsResponse {
  notifications?: RawNotification[]
  unread_count?: number
}

function getCsrfToken(): string {
  if (!browser) return ''
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || ''
}

function getHeaders() {
  return {
    'X-CSRF-TOKEN': getCsrfToken(),
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

// Svelte 5 runes-based notification state
let notifications = $state<Notification[]>([])
let unreadCount = $state(0)
let loading = $state(false)
let error = $state<string | null>(null)
let fetched = $state(false)

async function fetchLatest(limit: number = 10) {
  if (!browser) return
  loading = true
  try {
    const response = await axios.get<LatestNotificationsResponse>('/notifications/latest', {
      params: { limit },
      headers: getHeaders(),
    })
    const payload = response.data
    const data = payload.notifications ?? []
    const unread = payload.unread_count ?? 0

    notifications = data.map((n: RawNotification) => ({
      id: n.id ?? '',
      user_id: n.user_id ?? '',
      title: n.title ?? '',
      message: n.message ?? '',
      is_read: n.is_read ?? false,
      type: n.type ?? FRONTEND_NOTIFICATION_TYPES.DEFAULT,
      related_entity_type: n.related_entity_type ?? null,
      related_entity_id: n.related_entity_id ?? null,
      metadata: n.metadata ?? null,
      created_at: n.created_at ?? new Date().toISOString(),
      updated_at: n.updated_at ?? new Date().toISOString(),
      read_at: n.read_at ?? null,
    }))
    unreadCount = unread
    error = null
    fetched = true
  } catch {
    notifications = []
    unreadCount = 0
    error = 'Không thể tải thông báo'
    fetched = true
  } finally {
    loading = false
  }
}

async function markAsRead(id: string) {
  try {
    await axios.post(`/notifications/${id}/mark-as-read`, {}, { headers: getHeaders() })
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
    )
    unreadCount = Math.max(0, unreadCount - 1)
  } catch {
    /* ignore */
  }
}

async function markAllAsRead() {
  try {
    await axios.post('/notifications/mark-all-as-read', {}, { headers: getHeaders() })
    notifications = notifications.map((n) => ({
      ...n,
      is_read: true,
      read_at: new Date().toISOString(),
    }))
    unreadCount = 0
  } catch {
    /* ignore */
  }
}

async function deleteNotification(id: string) {
  try {
    const target = notifications.find((n) => n.id === id)
    await axios.delete(`/notifications/${id}`, { headers: getHeaders() })
    notifications = notifications.filter((n) => n.id !== id)
    if (target && !target.is_read) {
      unreadCount = Math.max(0, unreadCount - 1)
    }
  } catch {
    /* ignore */
  }
}

async function refresh() {
  await fetchLatest()
}

export function useNotifications() {
  // Auto-fetch on first use
  if (browser && !fetched && !loading) {
    void fetchLatest()
  }

  return {
    get notifications() {
      return notifications
    },
    get unreadCount() {
      return unreadCount
    },
    get loading() {
      return loading
    },
    get error() {
      return error
    },
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
  }
}
