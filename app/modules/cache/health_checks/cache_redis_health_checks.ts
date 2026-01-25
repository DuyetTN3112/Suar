import { RedisCheck, RedisMemoryUsageCheck } from '@adonisjs/redis'
import Redis from '@adonisjs/redis/services/main'

/**
 * Vendor health checks need the concrete Redis connection. Keep that ownership
 * inside the Cache health-check adapter instead of leaking the raw connection to `start/`.
 */
export function createCacheRedisConnectivityCheck(): RedisCheck {
  return new RedisCheck(Redis.connection('cache'))
}

export function createCacheRedisMemoryUsageCheck(): RedisMemoryUsageCheck {
  return new RedisMemoryUsageCheck(Redis.connection('cache'))
}
