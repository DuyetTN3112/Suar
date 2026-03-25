import type { DatabaseId } from '#types/database'
import AuditLog from '#models/audit_log'

/**
 * LucidAuditLogRepository
 *
 * Additional Lucid-based audit log query methods.
 * Supplements the existing AuditLogRepository interface (create/findMany/count)
 * with rich query methods that were previously on the AuditLog model.
 */
export default class LucidAuditLogRepository {
  private readonly __instanceMarker = true

  static {
    void new LucidAuditLogRepository().__instanceMarker
  }

  static async getRecentActivity(
    entityType: string,
    entityId: DatabaseId,
    limit: number = 10
  ): Promise<AuditLog[]> {
    return AuditLog.query()
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('user')
  }

  static async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>> {
    if (userIds.length === 0) return new Map()

    const dbModule = await import('@adonisjs/lucid/services/db')
    const db = dbModule.default
    const results = (await db
      .from('audit_logs')
      .select('user_id')
      .max('created_at as last_active')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .whereIn('user_id', userIds)
      .groupBy('user_id')) as Array<{ user_id: DatabaseId; last_active: Date | null }>

    const map = new Map<string, Date | null>()
    for (const row of results) {
      map.set(row.user_id, row.last_active)
    }
    return map
  }
}
