import {
  HealthChecks,
  DiskSpaceCheck,
  MemoryHeapCheck,
  MemoryRSSCheck,
} from '@adonisjs/core/health'
import { DbCheck, DbConnectionCountCheck } from '@adonisjs/lucid/database'
import db from '@adonisjs/lucid/services/db'
import { RedisCheck, RedisMemoryUsageCheck } from '@adonisjs/redis'
import redis from '@adonisjs/redis/services/main'

import { cacheInvalidationBacklogReader } from '#composition/adapters/cache_invalidation_backlog_reader'
import { HttpSearchHealthReaderAdapter } from '#composition/adapters/http_search_health_reader_adapter'
import { platformOperationalLogger } from '#composition/platform_operational_logger_composition'
import { searchPublicApi } from '#composition/search_public_api_composition'
import {
  createCacheRedisConnectivityCheck,
  createCacheRedisMemoryUsageCheck,
} from '#modules/cache/health_checks/cache_redis_health_checks'
import { ApplicationCheck } from '#modules/http/health_checks/application_check'
import { CacheInvalidationOutboxHealthCheck } from '#modules/http/health_checks/cache_invalidation_outbox_health_check'
import { DegradedDependencyHealthCheck } from '#modules/http/health_checks/degraded_dependency_health_check'
import { DomainEventOutboxHealthCheck } from '#modules/http/health_checks/domain_event_outbox_health_check'
import { NotificationPipelineHealthCheck } from '#modules/http/health_checks/notification_pipeline_health_check'
import { SearchHealthCheck } from '#modules/http/health_checks/search_health_check'
import env from '#start/env'

export const healthChecks = new HealthChecks().register([
  // Disk checks - cache kết quả trong 1 giờ
  new DiskSpaceCheck()
    .warnWhenExceeds(75) // cảnh báo khi vượt quá 75%
    .failWhenExceeds(85) // lỗi khi vượt quá 85%
    .cacheFor('1 hour'),

  // Memory checks
  new MemoryHeapCheck().warnWhenExceeds('250 mb').failWhenExceeds('300 mb'),
  new MemoryRSSCheck().warnWhenExceeds('320 mb').failWhenExceeds('350 mb'),

  // Database checks
  new DbCheck(db.connection()),
  new DbConnectionCountCheck(db.connection()).warnWhenExceeds(10).failWhenExceeds(15),
  // Security-sensitive Redis and rebuildable cache are separate dependencies.
  new RedisCheck(redis.connection('main')),
  new RedisMemoryUsageCheck(redis.connection('main'))
    .warnWhenExceeds(env.get('REDIS_MAIN_MEMORY_WARN', '400 mb'))
    .failWhenExceeds(env.get('REDIS_MAIN_MEMORY_FAIL', '460 mb')),
  new DegradedDependencyHealthCheck(createCacheRedisConnectivityCheck(), {
    degradedMessage: 'Optional cache Redis connection is degraded',
  }),
  new DegradedDependencyHealthCheck(
    createCacheRedisMemoryUsageCheck()
      .warnWhenExceeds(env.get('REDIS_CACHE_MEMORY_WARN', '200 mb'))
      .failWhenExceeds(env.get('REDIS_CACHE_MEMORY_FAIL', '240 mb')),
    {
      degradedMessage: 'Optional cache Redis memory pressure is degraded',
    }
  ),
  new CacheInvalidationOutboxHealthCheck(cacheInvalidationBacklogReader).cacheFor('5 seconds'),
  new DomainEventOutboxHealthCheck().cacheFor('5 seconds'),
  new NotificationPipelineHealthCheck().cacheFor('5 seconds'),

  // Custom application check
  new ApplicationCheck().cacheFor('15 minutes'),
  new SearchHealthCheck(
    new HttpSearchHealthReaderAdapter(searchPublicApi),
    platformOperationalLogger
  ).cacheFor('1 minute'),
])
