import axios from 'axios'

import {
  parseNotificationRealtimeSignal,
  transmitNotificationRealtimeClient,
  type NotificationRealtimeClient,
  type NotificationRealtimeSignal,
} from '@/apps/shared/notifications/notification_realtime_client'

const browser = typeof window !== 'undefined'
const MAX_LATEST_ITEMS = 100
const REALTIME_REFRESH_DELAYS_MS = [0, 500, 1_500] as const

export interface NotificationAction {
  routeName: string
  params: Record<string, string>
}

export interface NotificationCenterItem {
  id: string
  eventId: string | null
  userId: string
  title: string
  message: string
  isRead: boolean
  type: string
  relatedEntityType: string | null
  relatedEntityId: string | null
  metadata: Record<string, unknown> | null
  schemaVersion: 1
  category: string
  priority: string
  action: NotificationAction | null
  revision: number
  occurredAt: string
  createdAt: string
  updatedAt: string
  readAt: string | null
}

export interface NotificationCenterPagination {
  mode: 'cursor'
  page: number
  perPage: number
  total: number
  lastPage: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor: string | null
  previousCursor: string | null
}

export interface LatestNotificationPayload {
  data: NotificationCenterItem[]
  recipientId: string
  unreadCount: number
  recipientStateRevision: number
  pagination: NotificationCenterPagination
}

export interface NotificationCenterTransport {
  getLatest(limit: number): Promise<unknown>
  markAsRead(id: string): Promise<void>
  markAllAsRead(): Promise<void>
  delete(id: string): Promise<void>
}

interface NotificationCenterStoreOptions {
  transport?: NotificationCenterTransport
  loadErrorMessage: () => string
  mutationErrorMessage: () => string
  autoFetch?: boolean
  autoRealtime?: boolean
  initialLimit?: number
  realtime?: NotificationRealtimeClient
  foregroundPollingMs?: number | false
}

function headers() {
  const csrfToken = browser
    ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? ''
    : ''

  return {
    'X-CSRF-TOKEN': csrfToken,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
}

const axiosTransport: NotificationCenterTransport = {
  async getLatest(limit) {
    const response = await axios.get<unknown>('/notifications/latest', {
      params: { limit },
      headers: headers(),
    })
    return response.data
  },
  async markAsRead(id) {
    await axios.post(`/notifications/${encodeURIComponent(id)}/mark-as-read`, {}, { headers: headers() })
  },
  async markAllAsRead() {
    await axios.post('/notifications/mark-all-as-read', {}, { headers: headers() })
  },
  async delete(id) {
    await axios.delete(`/notifications/${encodeURIComponent(id)}`, { headers: headers() })
  },
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object`)
  }
  return value as Record<string, unknown>
}

function stringValue(
  value: unknown,
  path: string,
  options: { nullable?: false; maximum?: number }
): string
function stringValue(
  value: unknown,
  path: string,
  options: { nullable: true; maximum?: number }
): string | null
function stringValue(
  value: unknown,
  path: string,
  options: { nullable?: boolean; maximum?: number } = {}
): string | null {
  if (options.nullable && value === null) {
    return null
  }
  const maximum = options.maximum ?? 512
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new TypeError(`${path} must be a non-empty string of at most ${maximum} characters`)
  }
  return value
}

function safeInteger(value: unknown, path: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    throw new TypeError(`${path} must be a safe integer greater than or equal to ${minimum}`)
  }
  return Number(value)
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== 'boolean') {
    throw new TypeError(`${path} must be a boolean`)
  }
  return value
}

function timestamp(value: unknown, path: string, nullable = false): string | null {
  if (nullable && value === null) {
    return null
  }
  const text = stringValue(value, path, { maximum: 64 })
  if (Number.isNaN(Date.parse(text))) {
    throw new TypeError(`${path} must be an ISO-8601 timestamp`)
  }
  return text
}

function metadata(value: unknown, path: string): Record<string, unknown> | null {
  if (value === null) {
    return null
  }
  return record(value, path)
}

function action(value: unknown, path: string): NotificationAction | null {
  if (value === null) {
    return null
  }
  const input = record(value, path)
  const rawParams = record(input['params'], `${path}.params`)
  const params: Record<string, string> = {}
  for (const [key, rawValue] of Object.entries(rawParams)) {
    params[stringValue(key, `${path}.params key`, { maximum: 64 })] = stringValue(
      rawValue,
      `${path}.params.${key}`,
      { maximum: 512 }
    )
  }
  return {
    routeName: stringValue(input['routeName'], `${path}.routeName`, { maximum: 128 }),
    params,
  }
}

function parseNotification(value: unknown, index: number): NotificationCenterItem {
  const path = `notification[${index}]`
  const input = record(value, path)
  if (input['schemaVersion'] !== 1) {
    throw new TypeError(`${path}.schemaVersion is unsupported`)
  }

  return {
    id: stringValue(input['id'], `${path}.id`, { maximum: 128 }),
    eventId: stringValue(input['eventId'], `${path}.eventId`, {
      nullable: true,
      maximum: 128,
    }),
    userId: stringValue(input['userId'], `${path}.userId`, { maximum: 128 }),
    title: stringValue(input['title'], `${path}.title`, { maximum: 1024 }),
    message: stringValue(input['message'], `${path}.message`, { maximum: 8192 }),
    isRead: booleanValue(input['isRead'], `${path}.isRead`),
    type: stringValue(input['type'], `${path}.type`, { maximum: 128 }),
    relatedEntityType: stringValue(
      input['relatedEntityType'],
      `${path}.relatedEntityType`,
      { nullable: true, maximum: 128 }
    ),
    relatedEntityId: stringValue(input['relatedEntityId'], `${path}.relatedEntityId`, {
      nullable: true,
      maximum: 512,
    }),
    metadata: metadata(input['metadata'], `${path}.metadata`),
    schemaVersion: 1,
    category: stringValue(input['category'], `${path}.category`, { maximum: 64 }),
    priority: stringValue(input['priority'], `${path}.priority`, { maximum: 32 }),
    action: action(input['action'], `${path}.action`),
    revision: safeInteger(input['revision'], `${path}.revision`, 1),
    occurredAt: timestamp(input['occurredAt'], `${path}.occurredAt`) as string,
    createdAt: timestamp(input['createdAt'], `${path}.createdAt`) as string,
    updatedAt: timestamp(input['updatedAt'], `${path}.updatedAt`) as string,
    readAt: timestamp(input['readAt'], `${path}.readAt`, true),
  }
}

function parsePagination(value: unknown): NotificationCenterPagination {
  const input = record(value, 'pagination')
  if (input['mode'] !== 'cursor') {
    throw new TypeError('pagination.mode must be cursor')
  }
  return {
    mode: 'cursor',
    page: safeInteger(input['page'], 'pagination.page', 1),
    perPage: safeInteger(input['perPage'], 'pagination.perPage', 1),
    total: safeInteger(input['total'], 'pagination.total'),
    lastPage: safeInteger(input['lastPage'], 'pagination.lastPage', 1),
    hasNextPage: booleanValue(input['hasNextPage'], 'pagination.hasNextPage'),
    hasPreviousPage: booleanValue(input['hasPreviousPage'], 'pagination.hasPreviousPage'),
    nextCursor: stringValue(input['nextCursor'], 'pagination.nextCursor', {
      nullable: true,
      maximum: 2048,
    }),
    previousCursor: stringValue(input['previousCursor'], 'pagination.previousCursor', {
      nullable: true,
      maximum: 2048,
    }),
  }
}

export function parseLatestNotificationPayload(value: unknown): LatestNotificationPayload {
  const input = record(value, 'notification response')
  if (!Array.isArray(input['data']) || input['data'].length > MAX_LATEST_ITEMS) {
    throw new TypeError(`notification response.data must contain at most ${MAX_LATEST_ITEMS} items`)
  }

  return {
    data: input['data'].map(parseNotification),
    recipientId: stringValue(input['recipientId'], 'notification response.recipientId', {
      maximum: 128,
    }),
    unreadCount: safeInteger(input['unreadCount'], 'notification response.unreadCount'),
    recipientStateRevision: safeInteger(
      input['recipientStateRevision'],
      'notification response.recipientStateRevision',
      1
    ),
    pagination: parsePagination(input['pagination']),
  }
}

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
