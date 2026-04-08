import { describe, expect, it, vi } from 'vitest'

import {
  createNotificationCenterStore,
  parseLatestNotificationPayload,
  type NotificationCenterTransport,
} from '@/apps/shared/notifications/notification_center_store.svelte'
import {
  parseNotificationRealtimeSignal,
  type NotificationRealtimeHandlers,
  type NotificationRealtimeSignal,
} from '@/apps/shared/notifications/notification_realtime_client'

function notification(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    eventId: '11111111-1111-4111-8111-111111111111',
    userId: '22222222-2222-4222-8222-222222222222',
    title: `Title ${id}`,
    message: `Message ${id}`,
    isRead: false,
    type: 'future_catalog_type',
    relatedEntityType: 'task',
    relatedEntityId: 'task-1',
    metadata: { source: 'contract-test' },
    schemaVersion: 1,
    category: 'task',
    priority: 'high',
    action: { routeName: 'tasks.show', params: { id: 'task-1' } },
    revision: 7,
    occurredAt: '2026-07-23T00:00:00.000Z',
    createdAt: '2026-07-23T00:00:01.000Z',
    updatedAt: '2026-07-23T00:00:02.000Z',
    readAt: null,
    ...overrides,
  }
}

function payload(
  items: unknown[],
  unreadCount = items.length,
  recipientStateRevision = Math.max(1, unreadCount)
) {
  return {
    data: items,
    recipientId: '22222222-2222-4222-8222-222222222222',
    unreadCount,
    recipientStateRevision,
    pagination: {
      mode: 'cursor',
      page: 1,
      perPage: 10,
      total: items.length,
      lastPage: 1,
      hasNextPage: false,
      hasPreviousPage: false,
      nextCursor: null,
      previousCursor: null,
    },
  }
}

function transport(overrides: Partial<NotificationCenterTransport> = {}): NotificationCenterTransport {
  return {
    getLatest: () => Promise.resolve(payload([])),
    markAsRead: () => Promise.resolve(),
    markAllAsRead: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    ...overrides,
  }
}

describe('notification center client contract', () => {
  it('accepts only revisioned content-free realtime signal shapes', () => {
    expect(
      parseNotificationRealtimeSignal({
        type: 'notification.feed.changed',
        notificationId: 'notification-1',
        notificationRevision: 8,
      })
    ).toEqual({
      type: 'notification.feed.changed',
      notificationId: 'notification-1',
      notificationRevision: 8,
    })
    expect(
      parseNotificationRealtimeSignal({
        type: 'notification.count.changed',
        recipientStateRevision: 9,
      })
    ).toEqual({
      type: 'notification.count.changed',
      recipientStateRevision: 9,
    })
    expect(parseNotificationRealtimeSignal({ type: 'session.revoked' })).toBe(
      'session.revoked'
    )
    expect(
      parseNotificationRealtimeSignal({
        type: 'notification.feed.changed',
        notificationId: '',
        notificationRevision: 0,
      })
    ).toBeNull()
    expect(
      parseNotificationRealtimeSignal({
        type: 'notification.count.changed',
        recipientStateRevision: 1.5,
      })
    ).toBeNull()
  })

  it('preserves versioned canonical fields and accepts future catalog types', () => {
    const result = parseLatestNotificationPayload(payload([notification('notification-1')]))

    expect(result.data[0]).toMatchObject({
      id: 'notification-1',
      type: 'future_catalog_type',
      category: 'task',
      priority: 'high',
      revision: 7,
      metadata: { source: 'contract-test' },
      action: { routeName: 'tasks.show', params: { id: 'task-1' } },
    })
    expect(result.recipientId).toBe('22222222-2222-4222-8222-222222222222')
    expect(result.recipientStateRevision).toBe(1)
  })

  it('rejects malformed payloads instead of manufacturing empty notification fields', () => {
    expect(() =>
      parseLatestNotificationPayload(payload([notification('notification-1', { title: null })]))
    ).toThrow('notification[0].title')
    expect(() => parseLatestNotificationPayload(payload([], -1))).toThrow('unreadCount')
  })

  it('keeps the newest refresh result when responses complete out of order', async () => {
    let resolveFirst: ((value: unknown) => void) | undefined
    let resolveSecond: ((value: unknown) => void) | undefined
    const getLatest = vi
      .fn<NotificationCenterTransport['getLatest']>()
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveFirst = resolve
        })
      )
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveSecond = resolve
        })
      )
    const store = createNotificationCenterStore({
      transport: transport({ getLatest }),
      loadErrorMessage: () => 'load failed',
      mutationErrorMessage: () => 'mutation failed',
      autoFetch: false,
    })

    const olderRequest = store.refresh()
    const newerRequest = store.refresh()
    resolveSecond?.(payload([notification('newer')]))
    await newerRequest
    resolveFirst?.(payload([notification('older')]))
    await olderRequest

    expect(store.notifications.map((item) => item.id)).toEqual(['newer'])
  })

  it('coalesces duplicate mutations and decrements unread count exactly once', async () => {
    let resolveMutation: (() => void) | undefined
    const markAsRead = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveMutation = resolve
        })
    )
    const store = createNotificationCenterStore({
      transport: transport({
        getLatest: () => Promise.resolve(payload([notification('notification-1')], 1)),
        markAsRead,
      }),
      loadErrorMessage: () => 'load failed',
      mutationErrorMessage: () => 'mutation failed',
      autoFetch: false,
    })
    await store.refresh()

    const first = store.markAsRead('notification-1')
    const duplicate = store.markAsRead('notification-1')
    resolveMutation?.()

    await expect(first).resolves.toBe(true)
    await expect(duplicate).resolves.toBe(false)
    expect(markAsRead).toHaveBeenCalledTimes(1)
    expect(store.unreadCount).toBe(0)
    expect(store.notifications[0]?.isRead).toBe(true)
  })

  it('preserves last-known-good data and exposes an error when refresh fails', async () => {
    const getLatest = vi
      .fn<NotificationCenterTransport['getLatest']>()
      .mockResolvedValueOnce(payload([notification('notification-1')], 1))
      .mockRejectedValueOnce(new Error('network down'))
    const store = createNotificationCenterStore({
      transport: transport({ getLatest }),
      loadErrorMessage: () => 'load failed',
      mutationErrorMessage: () => 'mutation failed',
      autoFetch: false,
    })

    await store.refresh()
    await store.refresh()

    expect(store.notifications.map((item) => item.id)).toEqual(['notification-1'])
    expect(store.unreadCount).toBe(1)
    expect(store.error).toBe('load failed')
  })

  it('stops the bounded refresh sequence once the advertised count revision is visible', async () => {
    vi.useFakeTimers()
    let handlers: NotificationRealtimeHandlers | undefined
    const getLatest = vi
      .fn<NotificationCenterTransport['getLatest']>()
      .mockResolvedValueOnce(payload([notification('notification-1')], 1, 1))
      .mockResolvedValue(payload([notification('notification-1')], 1, 2))
    const store = createNotificationCenterStore({
      transport: transport({ getLatest }),
      realtime: {
        subscribe: (_recipientId, nextHandlers) => {
          handlers = nextHandlers
          return Promise.resolve(() => Promise.resolve())
        },
      },
      loadErrorMessage: () => 'load failed',
      mutationErrorMessage: () => 'mutation failed',
      autoFetch: false,
      foregroundPollingMs: false,
    })

    store.activate()
    await store.refresh()
    await Promise.resolve()
    handlers?.signal({
      type: 'notification.count.changed',
      recipientStateRevision: 2,
    })
    await vi.advanceTimersByTimeAsync(2_000)

    expect(getLatest).toHaveBeenCalledTimes(2)
    expect(store.recipientStateRevision).toBe(2)

    handlers?.signal({
      type: 'notification.count.changed',
      recipientStateRevision: 2,
    })
    await vi.advanceTimersByTimeAsync(2_000)
    expect(getLatest).toHaveBeenCalledTimes(2)

    await store.deactivate()
    vi.useRealTimers()
  })

  it('coalesces duplicate feed signals into a finite three-refresh visibility window', async () => {
    vi.useFakeTimers()
    let handlers: NotificationRealtimeHandlers | undefined
    const getLatest = vi
      .fn<NotificationCenterTransport['getLatest']>()
      .mockResolvedValue(payload([notification('notification-1')], 1, 1))
    const store = createNotificationCenterStore({
      transport: transport({ getLatest }),
      realtime: {
        subscribe: (_recipientId, nextHandlers) => {
          handlers = nextHandlers
          return Promise.resolve(() => Promise.resolve())
        },
      },
      loadErrorMessage: () => 'load failed',
      mutationErrorMessage: () => 'mutation failed',
      autoFetch: false,
      foregroundPollingMs: false,
    })

    store.activate()
    await store.refresh()
    await Promise.resolve()
    const signal: NotificationRealtimeSignal = {
      type: 'notification.feed.changed',
      notificationId: 'notification-1',
      notificationRevision: 8,
    }
    handlers?.signal(signal)
    handlers?.signal(signal)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(getLatest).toHaveBeenCalledTimes(4)
    await store.deactivate()
    vi.useRealTimers()
  })
})
