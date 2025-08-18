import loggerService from '#infra/logger/logger_service'
import type {
  AuditLogRepository,
  NotificationRepository,
  UserActivityLogRepository,
} from '#infra/shared/repositories/interfaces'

// ─── Factory Functions ───────────────────────────────────────

async function createMongoAuditLogRepo(): Promise<AuditLogRepository> {
  const { default: Repo } =
    await import('#infra/shared/repositories/mongo/mongo_audit_log_repository')
  return new Repo()
}

async function createMongoNotificationRepo(): Promise<NotificationRepository> {
  const { default: Repo } =
    await import('#infra/shared/repositories/mongo/mongo_notification_repository')
  return new Repo()
}

async function createMongoActivityLogRepo(): Promise<UserActivityLogRepository> {
  const { default: Repo } =
    await import('#infra/shared/repositories/mongo/mongo_user_activity_log_repository')
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
 * Uses MongoDB for all repository implementations.
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
    auditLogRepo = await createMongoAuditLogRepo()
    loggerService.info('AuditLog repository initialized: mongodb')
    return auditLogRepo
  },

  async getNotificationRepository(): Promise<NotificationRepository> {
    if (notificationRepo) return notificationRepo
    notificationRepo = await createMongoNotificationRepo()
    loggerService.info('Notification repository initialized: mongodb')
    return notificationRepo
  },

  async getUserActivityLogRepository(): Promise<UserActivityLogRepository> {
    if (activityLogRepo) return activityLogRepo
    activityLogRepo = await createMongoActivityLogRepo()
    loggerService.info('UserActivityLog repository initialized: mongodb')
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
