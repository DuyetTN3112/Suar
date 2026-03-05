import notificationConfig from '#config/notification'
import { cacheRedisCommandStore } from '#modules/cache/public_contracts/cache_store'
import {
  NotificationPermanentDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification_outbox_errors'
import type { NotificationUnreadProjectionValue } from '#modules/notifications/domain/notification_unread_state'

export type { NotificationUnreadProjectionValue } from '#modules/notifications/domain/notification_unread_state'

export interface NotificationUnreadRedis {
  eval(script: string, numberOfKeys: number, ...arguments_: string[]): Promise<unknown>
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const NOTIFICATION_UNREAD_CAS_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current and string.len(current) <= 512 then
  local decoded_ok, decoded = pcall(cjson.decode, current)
  if decoded_ok and type(decoded) == 'table' then
    local current_revision = tonumber(decoded.revision)
    if current_revision and current_revision >= tonumber(ARGV[2]) then
      return 0
    end
  end
end

local next_value = cjson.encode({
  count = tonumber(ARGV[1]),
  revision = tonumber(ARGV[2])
})
redis.call('SET', KEYS[1], next_value, 'EX', tonumber(ARGV[3]))
return 1
`

function defaultRedis(): NotificationUnreadRedis {
  return cacheRedisCommandStore
}

export function buildNotificationUnreadCacheKey(recipientId: string): string {
  return `notifications:v1:recipient:{${recipientId}}:unread`
}

function validateValue(value: NotificationUnreadProjectionValue): void {
  if (!UUID_PATTERN.test(value.recipientId)) {
    throw new NotificationPermanentDeliveryError('invalid_unread_recipient_id')
  }
  if (!Number.isSafeInteger(value.count) || value.count < 0) {
    throw new NotificationPermanentDeliveryError('invalid_unread_count')
  }
  if (!Number.isSafeInteger(value.revision) || value.revision < 0) {
    throw new NotificationPermanentDeliveryError('invalid_unread_revision')
  }
}

export class NotificationUnreadCacheProjection {
  constructor(
    private readonly redis: NotificationUnreadRedis = defaultRedis(),
    private readonly ttlSeconds: number = notificationConfig.unreadCacheTtlSeconds
  ) {
    if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > 3_600) {
      throw new RangeError('Notification unread cache TTL must be between 1 and 3600 seconds')
    }
  }

  async apply(value: NotificationUnreadProjectionValue): Promise<boolean> {
    validateValue(value)

    try {
      const result = await this.redis.eval(
        NOTIFICATION_UNREAD_CAS_SCRIPT,
        1,
        buildNotificationUnreadCacheKey(value.recipientId),
        String(value.count),
        String(value.revision),
        String(this.ttlSeconds)
      )
      if (result === 1 || result === '1') {
        return true
      }
      if (result === 0 || result === '0') {
        return false
      }
      throw new NotificationTransientDeliveryError('unexpected_unread_cache_cas_result')
    } catch (error) {
      if (
        error instanceof NotificationPermanentDeliveryError ||
        error instanceof NotificationTransientDeliveryError
      ) {
        throw error
      }
      throw new NotificationTransientDeliveryError('unread_cache_unavailable')
    }
  }
}
