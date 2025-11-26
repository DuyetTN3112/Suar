import axios from 'axios'

import {
  FRONTEND_NOTIFICATION_TYPES,
  type FrontendNotificationType,
} from '@/apps/org/modules/notifications/constants/notifications'

const browser = typeof window !== 'undefined'

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  isRead: boolean
  type: FrontendNotificationType
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata: string | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

interface RawNotification {
  id?: string
  userId?: string
  title?: string
  message?: string
  isRead?: boolean
  type?: FrontendNotificationType
  relatedEntityType?: string | null
  relatedEntityId?: string | null
  metadata?: string | null
  createdAt?: string
  updatedAt?: string
  readAt?: string | null
}

interface LatestNotificationsResponse {
  data?: RawNotification[]
  unreadCount?: number
}

function getCsrfToken(): string {
  if (!browser) return ''
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
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

async function fetchLatest(limit = 10) {
  if (!browser) return
  loading = true
  try {
    const response = await axios.get<LatestNotificationsResponse>('/notifications/latest', {
      params: { limit },
      headers: getHeaders(),
    })
    const payload = response.data
    const data = payload.data ?? []
    const unread = payload.unreadCount ?? 0

    notifications = data.map((n: RawNotification) => ({
      id: n.id ?? '',
      userId: n.userId ?? '',
      title: n.title ?? '',
      message: n.message ?? '',
      isRead: n.isRead ?? false,
      type: n.type ?? FRONTEND_NOTIFICATION_TYPES.DEFAULT,
      relatedEntityType: n.relatedEntityType ?? null,
      relatedEntityId: n.relatedEntityId ?? null,
      metadata: n.metadata ?? null,
      createdAt: n.createdAt ?? new Date().toISOString(),
      updatedAt: n.updatedAt ?? new Date().toISOString(),
      readAt: n.readAt ?? null,
    }))
    unreadCount = unread
    error = null
    fetched = true
  } catch {
    notifications = []
    unreadCount = 0
    error = 'Unable to load notifications'
    fetched = true
  } finally {
    loading = false
  }
}

async function markAsRead(id: string) {
  try {
    await axios.post(`/notifications/${id}/mark-as-read`, {}, { headers: getHeaders() })
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n
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
      isRead: true,
      readAt: new Date().toISOString(),
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
    if (target && !target.isRead) {
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
