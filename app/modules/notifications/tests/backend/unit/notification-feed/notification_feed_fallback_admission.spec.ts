import { test } from '@japa/runner'

import { NotificationFeedFallbackAdmissionUnavailableError } from '#modules/notifications/domain/notification-feed/notification_contract_errors'
import {
  NOTIFICATION_FEED_FALLBACK_ACQUIRE_SCRIPT,
  NOTIFICATION_FEED_FALLBACK_RELEASE_SCRIPT,
  RedisNotificationFeedFallbackAdmissionController,
  type NotificationFeedFallbackAdmissionRedis,
} from '#modules/notifications/infra/adapters/notification-feed/notification_feed_fallback_admission'

test.group('Unit | Notification Feed Fallback Admission', () => {
  test('acquires one bounded Redis lease and releases it by owner token', async ({ assert }) => {
    const calls: Array<{
      script: string
      numberOfKeys: number
      arguments: string[]
    }> = []
    const redis: NotificationFeedFallbackAdmissionRedis = {
      eval: (script, numberOfKeys, ...arguments_) => {
        calls.push({ script, numberOfKeys, arguments: arguments_ })
        return Promise.resolve(script === NOTIFICATION_FEED_FALLBACK_ACQUIRE_SCRIPT ? [1, 1] : 1)
      },
    }
    const controller = new RedisNotificationFeedFallbackAdmissionController({
      redis,
      maxConcurrent: 64,
      leaseMs: 10_000,
      token: () => 'lease-owner-1',
    })

    const lease = await controller.acquire()
    assert.isNotNull(lease)
    assert.equal(calls[0]?.script, NOTIFICATION_FEED_FALLBACK_ACQUIRE_SCRIPT)
    assert.equal(calls[0]?.numberOfKeys, 1)
    assert.equal(calls[0]?.arguments[1], '10000')
    assert.equal(calls[0]?.arguments[2], '64')
    assert.equal(calls[0]?.arguments[3], 'lease-owner-1')

    await lease?.release()
    assert.equal(calls[1]?.script, NOTIFICATION_FEED_FALLBACK_RELEASE_SCRIPT)
    assert.equal(calls[1]?.arguments[1], 'lease-owner-1')
  })

  test('returns no lease when the global PostgreSQL fallback budget is full', async ({
    assert,
  }) => {
    const controller = new RedisNotificationFeedFallbackAdmissionController({
      redis: {
        eval: () => Promise.resolve([0, 64]),
      },
      maxConcurrent: 64,
      leaseMs: 10_000,
    })

    assert.isNull(await controller.acquire())
  })

  test('fails closed when distributed coordination is unavailable or malformed', async ({
    assert,
  }) => {
    const unavailable = new RedisNotificationFeedFallbackAdmissionController({
      redis: {
        eval: () => Promise.reject(new Error('Redis unavailable')),
      },
      maxConcurrent: 64,
      leaseMs: 10_000,
    })
    const malformed = new RedisNotificationFeedFallbackAdmissionController({
      redis: {
        eval: () => Promise.resolve('unexpected'),
      },
      maxConcurrent: 64,
      leaseMs: 10_000,
    })

    await assert.rejects(
      () => unavailable.acquire(),
      NotificationFeedFallbackAdmissionUnavailableError
    )
    await assert.rejects(
      () => malformed.acquire(),
      NotificationFeedFallbackAdmissionUnavailableError
    )
  })

  test('treats lease release as best effort after the protected read has completed', async ({
    assert,
  }) => {
    let calls = 0
    const controller = new RedisNotificationFeedFallbackAdmissionController({
      redis: {
        eval: () => {
          calls += 1
          return calls === 1 ? Promise.resolve([1, 1]) : Promise.reject(new Error('release failed'))
        },
      },
      maxConcurrent: 64,
      leaseMs: 10_000,
    })

    const lease = await controller.acquire()
    await assert.doesNotReject(() => lease?.release() ?? Promise.resolve())
  })
})
