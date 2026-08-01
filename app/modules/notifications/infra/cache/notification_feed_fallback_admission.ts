import { randomUUID } from 'node:crypto'

import logger from '@adonisjs/core/services/logger'
import Redis from '@adonisjs/redis/services/main'

import type {
  NotificationFeedFallbackAdmissionController,
  NotificationFeedFallbackAdmissionLease,
} from '#modules/notifications/actions/ports/outbound/notification_feed_readers'
import { NotificationFeedFallbackAdmissionUnavailableError } from '#modules/notifications/domain/notification_contract_errors'

export interface NotificationFeedFallbackAdmissionRedis {
  eval(script: string, numberOfKeys: number, ...arguments_: string[]): Promise<unknown>
}

export const NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY =
  'notifications:v1:feed-fallback:{postgres}:leases'

export const NOTIFICATION_FEED_FALLBACK_ACQUIRE_SCRIPT = `
local redis_time = redis.call('TIME')
local now_ms = (tonumber(redis_time[1]) * 1000) + math.floor(tonumber(redis_time[2]) / 1000)
local lease_ms = tonumber(ARGV[1])
local max_concurrent = tonumber(ARGV[2])
local owner_token = ARGV[3]
local expires_at = now_ms + lease_ms

redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now_ms)
local active = redis.call('ZCARD', KEYS[1])
if active >= max_concurrent then
  return { 0, active }
end

redis.call('ZADD', KEYS[1], expires_at, owner_token)
redis.call('PEXPIRE', KEYS[1], lease_ms + 1000)
return { 1, active + 1 }
`

export const NOTIFICATION_FEED_FALLBACK_RELEASE_SCRIPT = `
local removed = redis.call('ZREM', KEYS[1], ARGV[1])
if redis.call('ZCARD', KEYS[1]) == 0 then
  redis.call('DEL', KEYS[1])
end
return removed
`

export const NOTIFICATION_FEED_FALLBACK_RENEW_SCRIPT = `
local redis_time = redis.call('TIME')
local now_ms = (tonumber(redis_time[1]) * 1000) + math.floor(tonumber(redis_time[2]) / 1000)
local lease_ms = tonumber(ARGV[1])
local owner_token = ARGV[2]
local current = redis.call('ZSCORE', KEYS[1], owner_token)
if not current then
  return 0
end

redis.call('ZADD', KEYS[1], 'XX', now_ms + lease_ms, owner_token)
redis.call('PEXPIRE', KEYS[1], lease_ms + 1000)
return 1
`

interface RedisNotificationFeedFallbackAdmissionOptions {
  redis?: NotificationFeedFallbackAdmissionRedis
  maxConcurrent: number
  leaseMs: number
  token?: () => string
}

function defaultRedis(): NotificationFeedFallbackAdmissionRedis {
  return Redis.connection('main')
}

function resultFlag(result: unknown): number | null {
  if (!Array.isArray(result) || result.length < 2) {
    return null
  }
  const flag = Number(result[0])
  const active = Number(result[1])
  if ((flag !== 0 && flag !== 1) || !Number.isSafeInteger(active) || active < 0) {
    return null
  }
  return flag
}

export class RedisNotificationFeedFallbackAdmissionController implements NotificationFeedFallbackAdmissionController {
  private redis: NotificationFeedFallbackAdmissionRedis | null
  private readonly maxConcurrent: number
  private readonly leaseMs: number
  private readonly token: () => string

  constructor(options: RedisNotificationFeedFallbackAdmissionOptions) {
    if (
      !Number.isSafeInteger(options.maxConcurrent) ||
      options.maxConcurrent < 1 ||
      options.maxConcurrent > 4_096
    ) {
      throw new RangeError('Notification fallback global concurrency must be between 1 and 4096')
    }
    if (
      !Number.isSafeInteger(options.leaseMs) ||
      options.leaseMs < 1_000 ||
      options.leaseMs > 60_000
    ) {
      throw new RangeError('Notification fallback admission lease must be 1-60 seconds')
    }
    this.redis = options.redis ?? null
    this.maxConcurrent = options.maxConcurrent
    this.leaseMs = options.leaseMs
    this.token = options.token ?? randomUUID
  }

  async acquire(): Promise<NotificationFeedFallbackAdmissionLease | null> {
    const ownerToken = this.token()
    let redis: NotificationFeedFallbackAdmissionRedis
    try {
      redis = this.redis ?? defaultRedis()
      this.redis = redis
      const result = await redis.eval(
        NOTIFICATION_FEED_FALLBACK_ACQUIRE_SCRIPT,
        1,
        NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY,
        String(this.leaseMs),
        String(this.maxConcurrent),
        ownerToken
      )
      const flag = resultFlag(result)
      if (flag === null) {
        throw new TypeError('Redis returned an invalid notification fallback admission result')
      }
      if (flag === 0) {
        return null
      }
    } catch (error) {
      throw new NotificationFeedFallbackAdmissionUnavailableError(error)
    }

    let stopped = false
    let renewalInFlight: Promise<void> | null = null
    const stopRenewal = () => {
      stopped = true
      clearInterval(renewalTimer)
    }
    const renew = async () => {
      if (stopped) {
        return
      }
      try {
        const result = Number(
          await redis.eval(
            NOTIFICATION_FEED_FALLBACK_RENEW_SCRIPT,
            1,
            NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY,
            String(this.leaseMs),
            ownerToken
          )
        )
        if (result === 1) {
          return
        }
        stopRenewal()
        logger.warn(
          {
            event_name: 'notification.feed.fallback_admission_lease_lost',
            subsystem: 'notification_feed',
          },
          'Notification fallback admission lease was lost before the protected read completed'
        )
      } catch (error) {
        stopRenewal()
        logger.warn(
          {
            event_name: 'notification.feed.fallback_admission_renewal_failed',
            subsystem: 'notification_feed',
            error_class: error instanceof Error ? error.name : 'UnknownError',
          },
          'Notification fallback admission lease renewal failed; local bulkhead remains active'
        )
      }
    }
    const renewalTimer = setInterval(
      () => {
        if (renewalInFlight) {
          return
        }
        renewalInFlight = renew().finally(() => {
          renewalInFlight = null
        })
      },
      Math.max(250, Math.floor(this.leaseMs / 3))
    )
    renewalTimer.unref()

    let released = false
    return {
      release: async () => {
        if (released) {
          return
        }
        released = true
        stopRenewal()
        await renewalInFlight
        try {
          await redis.eval(
            NOTIFICATION_FEED_FALLBACK_RELEASE_SCRIPT,
            1,
            NOTIFICATION_FEED_FALLBACK_ADMISSION_KEY,
            ownerToken
          )
        } catch (error) {
          logger.warn(
            {
              event_name: 'notification.feed.fallback_admission_release_failed',
              subsystem: 'notification_feed',
              error_class: error instanceof Error ? error.name : 'UnknownError',
            },
            'Notification fallback admission lease release failed; TTL recovery remains active'
          )
        }
      },
    }
  }
}
