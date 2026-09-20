import {
  parseNotificationRealtimeSignal,
  transmitNotificationRealtimeClient,
  type NotificationRealtimeSignal,
} from '@/apps/shared/notifications/notification_realtime_client'

import { parseLatestNotificationPayload } from './notification_center_parser.js'
import { axiosTransport } from './notification_center_transport.js'
import type {
  LatestNotificationPayload,
  NotificationAction,
  NotificationCenterItem,
  NotificationCenterPagination,
  NotificationCenterStoreOptions,
  NotificationCenterTransport,
} from './notification_center_types.js'

export type {
  LatestNotificationPayload,
  NotificationAction,
  NotificationCenterItem,
  NotificationCenterPagination,
  NotificationCenterStoreOptions,
  NotificationCenterTransport,
}

export { parseLatestNotificationPayload }

const browser = typeof window !== 'undefined'
const REALTIME_REFRESH_DELAYS_MS = [0, 500, 1_500] as const

export function createNotificationCenterStore(options: NotificationCenterStoreOptions) {
  const transport = options.transport ?? axiosTransport
  const realtime = options.realtime ?? transmitNotificationRealtimeClient
  const initialLimit = options.initialLimit ?? 10
  let notifications = $state<NotificationCenterItem[]>([])
  let unreadCount = $state(0)
  let recipientStateRevision = $state(0)
  let pagination = $state<NotificationCenterPagination | null>(null)
  let loading = $state(false)
  let error = $state<string | null>(null)
  let fetched = false
  let refreshSequence = 0
  let active = false
  let lifecycleGeneration = 0
  let currentRecipientId: string | null = null
  let realtimeRecipientId: string | null = null
  let realtimeStop: (() => Promise<void>) | null = null
  let realtimeStarting: Promise<void> | null = null
  let broadcastChannel: BroadcastChannel | null = null
  let foregroundPollingTimer: ReturnType<typeof setInterval> | null = null
  let refreshGeneration = 0
  const scheduledRefreshes = new Set<ReturnType<typeof setTimeout>>()
  const feedRevisionByNotification = new Map<string, number>()
  const pendingMutations = new Set<string>()

  function clearScheduledRefreshes(): void {
    refreshGeneration += 1
    for (const timer of scheduledRefreshes) {
      clearTimeout(timer)
    }
    scheduledRefreshes.clear()
  }

  function scheduleRealtimeRefresh(signal: NotificationRealtimeSignal): void {
    clearScheduledRefreshes()
    const generation = refreshGeneration
    for (const delay of REALTIME_REFRESH_DELAYS_MS) {
      const timer = setTimeout(() => {
        scheduledRefreshes.delete(timer)
        if (generation !== refreshGeneration || !active) {
          return
        }
        void refresh().then(() => {
          if (
            signal.type === 'notification.count.changed' &&
            recipientStateRevision >= signal.recipientStateRevision
          ) {
            clearScheduledRefreshes()
          }
        })
      }, delay)
      scheduledRefreshes.add(timer)
    }
  }

  function handleRealtimeSignal(
    signal: NotificationRealtimeSignal,
    shareWithTabs: boolean
  ): void {
    if (signal.type === 'notification.feed.changed') {
      const current = feedRevisionByNotification.get(signal.notificationId) ?? 0
      if (signal.notificationRevision <= current) {
        return
      }
      feedRevisionByNotification.set(signal.notificationId, signal.notificationRevision)
    } else if (signal.recipientStateRevision <= recipientStateRevision) {
      return
    }

    if (shareWithTabs) {
      broadcastChannel?.postMessage(signal)
    }
    scheduleRealtimeRefresh(signal)
  }

  async function ensureRealtime(recipientId: string): Promise<void> {
    if (
      !browser ||
      options.autoRealtime === false ||
      !active ||
      realtimeRecipientId === recipientId ||
      realtimeStarting
    ) {
      return
    }
    const activation = lifecycleGeneration
    realtimeStarting = (async () => {
      if (realtimeStop) {
        await realtimeStop()
        realtimeStop = null
      }
      broadcastChannel?.close()
      broadcastChannel =
        typeof BroadcastChannel === 'undefined'
          ? null
          : new BroadcastChannel(`suar:notifications:${recipientId}`)
      if (broadcastChannel) {
        broadcastChannel.onmessage = (event: MessageEvent<unknown>) => {
          const signal = parseNotificationRealtimeSignal(event.data)
          if (signal && signal !== 'session.revoked') {
            handleRealtimeSignal(signal, false)
          }
        }
      }
      try {
        const stop = await realtime.subscribe(recipientId, {
          signal: (signal) => handleRealtimeSignal(signal, true),
          reconnected: () => {
            if (active) {
              void refresh()
            }
          },
          sessionRevoked: () => {
            void deactivate()
            window.location.assign('/login')
          },
        })
        if (!isCurrentActivation(activation)) {
          await stop()
          return
        }
        realtimeStop = stop
        realtimeRecipientId = recipientId
      } catch {
        realtimeRecipientId = null
      }
    })().finally(() => {
      realtimeStarting = null
    })
    await realtimeStarting
  }

  async function refresh(limit = initialLimit): Promise<boolean> {
    if (!browser && !options.transport) {
      return false
    }
    const sequence = ++refreshSequence
    loading = true
    try {
      const payload = parseLatestNotificationPayload(await transport.getLatest(limit))
      if (sequence !== refreshSequence) {
        return false
      }
      notifications = payload.data
      currentRecipientId = payload.recipientId
      unreadCount = payload.unreadCount
      recipientStateRevision = payload.recipientStateRevision
      pagination = payload.pagination
      error = null
      fetched = true
      if (active) {
        void ensureRealtime(payload.recipientId)
      }
      return true
    } catch {
      if (sequence === refreshSequence) {
        error = options.loadErrorMessage()
        fetched = true
      }
      return false
    } finally {
      if (sequence === refreshSequence) {
        loading = false
      }
    }
  }

  function canStartMutation(key: string): boolean {
    return !pendingMutations.has('all') && !pendingMutations.has(key)
  }

  async function mutate(
    key: string,
    operation: () => Promise<void>,
    commit: () => void
  ): Promise<boolean> {
    if (!canStartMutation(key)) {
      return false
    }
    pendingMutations.add(key)
    try {
      await operation()
      commit()
      error = null
      return true
    } catch {
      error = options.mutationErrorMessage()
      return false
    } finally {
      pendingMutations.delete(key)
    }
  }

  async function markAsRead(id: string): Promise<boolean> {
    const target = notifications.find((item) => item.id === id)
    if (!target || target.isRead) {
      return false
    }
    const key = `notification:${id}`
    return mutate(
      key,
      () => transport.markAsRead(id),
      () => {
        const current = notifications.find((item) => item.id === id)
        if (!current || current.isRead) {
          return
        }
        const readAt = new Date().toISOString()
        notifications = notifications.map((item) =>
          item.id === id
            ? { ...item, isRead: true, readAt, revision: item.revision + 1, updatedAt: readAt }
            : item
        )
        unreadCount = Math.max(0, unreadCount - 1)
      }
    )
  }

  async function markAllAsRead(): Promise<boolean> {
    if (pendingMutations.size > 0) {
      return false
    }
    return mutate(
      'all',
      () => transport.markAllAsRead(),
      () => {
        const readAt = new Date().toISOString()
        notifications = notifications.map((item) =>
          item.isRead
            ? item
            : { ...item, isRead: true, readAt, revision: item.revision + 1, updatedAt: readAt }
        )
        unreadCount = 0
      }
    )
  }

  async function deleteNotification(id: string): Promise<boolean> {
    if (!notifications.some((item) => item.id === id)) {
      return false
    }
    const key = `notification:${id}`
    return mutate(
      key,
      () => transport.delete(id),
      () => {
        const current = notifications.find((item) => item.id === id)
        notifications = notifications.filter((item) => item.id !== id)
        if (current && !current.isRead) {
          unreadCount = Math.max(0, unreadCount - 1)
        }
      }
    )
  }

  function activate(): void {
    if (!browser || active) {
      return
    }
    active = true
    lifecycleGeneration += 1
    const pollMs = options.foregroundPollingMs ?? 30_000
    if (pollMs !== false) {
      foregroundPollingTimer = setInterval(() => {
        if (document.visibilityState === 'visible') {
          void refresh()
        }
      }, pollMs)
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)
    if (options.autoFetch !== false && !fetched && !loading) {
      void refresh()
    } else if (currentRecipientId) {
      void ensureRealtime(currentRecipientId)
    }
  }

  function onFocus(): void {
    if (active) {
      void refresh()
    }
  }

  function isCurrentActivation(generation: number): boolean {
    return active && lifecycleGeneration === generation
  }

  function onVisibilityChange(): void {
    if (active && document.visibilityState === 'visible') {
      void refresh()
    }
  }

  async function deactivate(): Promise<void> {
    if (!browser || !active) {
      return
    }
    active = false
    lifecycleGeneration += 1
    clearScheduledRefreshes()
    if (foregroundPollingTimer) {
      clearInterval(foregroundPollingTimer)
      foregroundPollingTimer = null
    }
    window.removeEventListener('focus', onFocus)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    broadcastChannel?.close()
    broadcastChannel = null
    realtimeRecipientId = null
    const stop = realtimeStop
    realtimeStop = null
    if (stop) {
      await stop()
    }
  }

  return {
    get notifications() {
      return notifications
    },
    get unreadCount() {
      return unreadCount
    },
    get recipientStateRevision() {
      return recipientStateRevision
    },
    get pagination() {
      return pagination
    },
    get loading() {
      return loading
    },
    get error() {
      return error
    },
    activate,
    deactivate,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  }
}
