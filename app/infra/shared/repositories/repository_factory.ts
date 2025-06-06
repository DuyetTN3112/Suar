import loggerService from '#services/logger_service'
import type {
  AuditLogCreateData,
  AuditLogQuery,
  AuditLogRecord,
  AuditLogRepository,
  NotificationCreateData,
  NotificationRecord,
  NotificationRepository,
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#infra/shared/repositories/interfaces'
import type { DatabaseId } from '#types/database'

/**
 * Storage driver type.
 *
 * - 'mysql': Use MySQL/PostgreSQL via Lucid ORM (default, always available)
 * - 'mongodb': Use MongoDB via Mongoose (requires MONGODB_URL)
 * - 'both': Dual-write to both MySQL and MongoDB (primary = MySQL, secondary = MongoDB)
 */
type StorageDriver = 'mysql' | 'mongodb' | 'both'

/**
 * Read a storage driver from env, defaulting to 'mysql'.
 */
function getStorageDriver(envKey: string): StorageDriver {
  const value = (process.env[envKey] ?? 'mongodb').toLowerCase()
  if (value === 'mongodb' || value === 'mongo') return 'mongodb'
  if (value === 'both' || value === 'dual') return 'both'
  return 'mysql'
}

// ─── Dual-Write Wrappers ─────────────────────────────────────

/**
 * DualWriteAuditLogRepository — writes to both MySQL and MongoDB.
 * MySQL is the primary (errors propagate). MongoDB is secondary (errors logged, not thrown).
 */
class DualWriteAuditLogRepository implements AuditLogRepository {
  constructor(
    private primary: AuditLogRepository,
    private secondary: AuditLogRepository
  ) {}

  async create(data: AuditLogCreateData): Promise<void> {
    await this.primary.create(data)
    // Secondary write is fire-and-forget — don't block primary
    this.secondary.create(data).catch((error: unknown) => {
      loggerService.error('DualWrite secondary (audit_log) create failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  async findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }> {
    return this.primary.findMany(query)
  }

  async count(query: AuditLogQuery): Promise<number> {
    return this.primary.count(query)
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>> {
    return this.primary.getLastActivityByUsers(entityType, entityId, userIds)
  }
}

/**
 * DualWriteNotificationRepository — writes to both, reads from primary (MySQL).
 */
class DualWriteNotificationRepository implements NotificationRepository {
  constructor(
    private primary: NotificationRepository,
    private secondary: NotificationRepository
  ) {}

  async create(data: NotificationCreateData): Promise<NotificationRecord | null> {
    const result = await this.primary.create(data)
    this.secondary.create(data).catch((error: unknown) => {
      loggerService.error('DualWrite secondary (notification) create failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
    return result
  }

  async findByUser(
    userId: DatabaseId,
    options?: { isRead?: boolean; limit?: number; page?: number }
  ): Promise<{ data: NotificationRecord[]; total: number }> {
    return this.primary.findByUser(userId, options)
  }

  async markAsRead(notificationId: DatabaseId): Promise<void> {
    await this.primary.markAsRead(notificationId)
    this.secondary.markAsRead(notificationId).catch(() => {})
  }

  async markAllAsRead(userId: DatabaseId): Promise<void> {
    await this.primary.markAllAsRead(userId)
    this.secondary.markAllAsRead(userId).catch(() => {})
  }

  async getUnreadCount(userId: DatabaseId): Promise<number> {
    return this.primary.getUnreadCount(userId)
  }
}

/**
 * DualWriteUserActivityLogRepository — writes to both, reads from primary.
 */
class DualWriteUserActivityLogRepository implements UserActivityLogRepository {
  constructor(
    private primary: UserActivityLogRepository,
    private secondary: UserActivityLogRepository
  ) {}

  async create(data: UserActivityLogCreateData): Promise<void> {
    await this.primary.create(data)
    this.secondary.create(data).catch((error: unknown) => {
      loggerService.error('DualWrite secondary (activity_log) create failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  async findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    return this.primary.findByUser(userId, options)
  }
}

// ─── Factory Functions ───────────────────────────────────────

/**
 * Lazily create MySQL repository instances (dynamic import avoids circular deps).
 */
async function createMysqlAuditLogRepo(): Promise<AuditLogRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mysql/mysql_audit_log_repository')
  return new Repo()
}

async function createMysqlNotificationRepo(): Promise<NotificationRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mysql/mysql_notification_repository')
  return new Repo()
}

async function createMysqlActivityLogRepo(): Promise<UserActivityLogRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mysql/mysql_user_activity_log_repository')
  return new Repo()
}

async function createMongoAuditLogRepo(): Promise<AuditLogRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mongo/mongo_audit_log_repository')
  return new Repo()
}

async function createMongoNotificationRepo(): Promise<NotificationRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mongo/mongo_notification_repository')
  return new Repo()
}

async function createMongoActivityLogRepo(): Promise<UserActivityLogRepository> {
  const { default: Repo } = await import('#infra/shared/repositories/mongo/mongo_user_activity_log_repository')
  return new Repo()
}

// ─── Singleton Cache ─────────────────────────────────────────

let auditLogRepo: AuditLogRepository | null = null
let notificationRepo: NotificationRepository | null = null
let activityLogRepo: UserActivityLogRepository | null = null

// ─── Public API ──────────────────────────────────────────────

/**
 * Repository Factory
 *
 * Resolves repository implementations based on env vars:
 *   - AUDIT_STORAGE=mysql|mongodb|both (default: mysql)
 *   - NOTIFICATION_STORAGE=mysql|mongodb|both (default: mysql)
 *   - ACTIVITY_LOG_STORAGE=mysql|mongodb|both (default: mysql)
 *
 * Instances are lazily created and cached as singletons.
 *
 * @example
 * ```ts
 * const auditRepo = await RepositoryFactory.getAuditLogRepository()
 * await auditRepo.create({ user_id: userId, action: 'create', ... })
 * ```
 */
const RepositoryFactory = {
  async getAuditLogRepository(): Promise<AuditLogRepository> {
    if (auditLogRepo) return auditLogRepo

    const driver = getStorageDriver('AUDIT_STORAGE')

    switch (driver) {
      case 'mongodb':
        auditLogRepo = await createMongoAuditLogRepo()
        break
      case 'both':
        auditLogRepo = new DualWriteAuditLogRepository(
          await createMysqlAuditLogRepo(),
          await createMongoAuditLogRepo()
        )
        break
      case 'mysql':
      default:
        auditLogRepo = await createMysqlAuditLogRepo()
        break
    }

    loggerService.info(`AuditLog repository initialized: ${driver}`)
    return auditLogRepo
  },

  async getNotificationRepository(): Promise<NotificationRepository> {
    if (notificationRepo) return notificationRepo

    const driver = getStorageDriver('NOTIFICATION_STORAGE')

    switch (driver) {
      case 'mongodb':
        notificationRepo = await createMongoNotificationRepo()
        break
      case 'both':
        notificationRepo = new DualWriteNotificationRepository(
          await createMysqlNotificationRepo(),
          await createMongoNotificationRepo()
        )
        break
      case 'mysql':
      default:
        notificationRepo = await createMysqlNotificationRepo()
        break
    }

    loggerService.info(`Notification repository initialized: ${driver}`)
    return notificationRepo
  },

  async getUserActivityLogRepository(): Promise<UserActivityLogRepository> {
    if (activityLogRepo) return activityLogRepo

    const driver = getStorageDriver('ACTIVITY_LOG_STORAGE')

    switch (driver) {
      case 'mongodb':
        activityLogRepo = await createMongoActivityLogRepo()
        break
      case 'both':
        activityLogRepo = new DualWriteUserActivityLogRepository(
          await createMysqlActivityLogRepo(),
          await createMongoActivityLogRepo()
        )
        break
      case 'mysql':
      default:
        activityLogRepo = await createMysqlActivityLogRepo()
        break
    }

    loggerService.info(`UserActivityLog repository initialized: ${driver}`)
    return activityLogRepo
  },

  /**
   * Reset all cached singletons.
   * Useful for testing or when env vars change at runtime.
   */
  reset(): void {
    auditLogRepo = null
    notificationRepo = null
    activityLogRepo = null
  },
} as const

export default RepositoryFactory
