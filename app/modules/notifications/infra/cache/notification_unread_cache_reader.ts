import { cacheRedisCommandStore } from '#modules/cache/public_contracts/cache_store'
import type { NotificationUnreadCacheReader } from '#modules/notifications/actions/ports/outbound/notification_unread_state'
import { buildNotificationUnreadCacheKey } from '#modules/notifications/infra/cache/notification_unread_cache_projection'

export class RedisNotificationUnreadCacheReader implements NotificationUnreadCacheReader {
  async get(recipientId: string): Promise<string | null> {
    return cacheRedisCommandStore.get(buildNotificationUnreadCacheKey(recipientId))
  }
}
