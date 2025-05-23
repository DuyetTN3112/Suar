import {
  HealthChecks,
  DiskSpaceCheck,
  MemoryHeapCheck,
  MemoryRSSCheck,
} from '@adonisjs/core/health'
import db from '@adonisjs/lucid/services/db'
import { DbCheck, DbConnectionCountCheck } from '@adonisjs/lucid/database'
import redis from '@adonisjs/redis/services/main'
import { RedisCheck, RedisMemoryUsageCheck } from '@adonisjs/redis'
import { ApplicationCheck } from '../app/health_checks/application_check.js'

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
  // Redis checks nếu sử dụng Redis
  new RedisCheck(redis.connection()),
  new RedisMemoryUsageCheck(redis.connection()).warnWhenExceeds('100 mb').failWhenExceeds('120 mb'),

  // Custom application check
  new ApplicationCheck().cacheFor('15 minutes'),
])
