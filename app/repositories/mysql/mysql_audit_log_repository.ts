import AuditLog from '#models/audit_log'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import type {
  AuditLogCreateData,
  AuditLogQuery,
  AuditLogRecord,
  AuditLogRepository,
} from '#repositories/interfaces'

/**
 * MySQL/PostgreSQL AuditLog Repository — Lucid ORM implementation.
 */
export default class MysqlAuditLogRepository implements AuditLogRepository {
  async create(data: AuditLogCreateData): Promise<void> {
    try {
      await AuditLog.create({
        user_id: data.user_id,
        action: data.action,
        entity_type: data.entity_type,
        entity_id: data.entity_id ?? null,
        old_values: data.old_values ?? null,
        new_values: data.new_values ?? null,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
      })
    } catch (error) {
      loggerService.error('MysqlAuditLogRepository.create failed', {
        action: data.action,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 50

    const qb = AuditLog.query().orderBy('created_at', 'desc')

    if (query.user_id !== undefined) {
      void qb.where('user_id', query.user_id)
    }
    if (query.entity_type !== undefined) {
      void qb.where('entity_type', query.entity_type)
    }
    if (query.entity_id !== undefined) {
      void qb.where('entity_id', query.entity_id)
    }
    if (query.action !== undefined) {
      void qb.where('action', query.action)
    }
    if (query.from !== undefined) {
      void qb.where('created_at', '>=', query.from)
    }
    if (query.to !== undefined) {
      void qb.where('created_at', '<=', query.to)
    }

    const result = await qb.paginate(page, limit)

    return {
      data: result.all().map((row) => this.toRecord(row)),
      total: result.total,
    }
  }

  async count(query: AuditLogQuery): Promise<number> {
    const qb = AuditLog.query()

    if (query.user_id !== undefined) {
      void qb.where('user_id', query.user_id)
    }
    if (query.entity_type !== undefined) {
      void qb.where('entity_type', query.entity_type)
    }
    if (query.action !== undefined) {
      void qb.where('action', query.action)
    }

    const result = await qb.count('* as total')
    const firstRow = result[0]
    return firstRow ? Number(firstRow.$extras.total ?? 0) : 0
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>> {
    const map = new Map<string, Date | null>()
    if (userIds.length === 0) return map

    try {
      const results = await AuditLog.query()
        .where('entity_type', entityType)
        .where('entity_id', String(entityId))
        .whereIn('user_id', userIds.map(String))
        .select('user_id')
        .max('created_at as last_active')
        .groupBy('user_id')

      for (const row of results) {
        const lastActive = (row as any).$extras?.last_active
        map.set(String(row.user_id), lastActive ? new Date(lastActive) : null)
      }
    } catch (error) {
      loggerService.error('MysqlAuditLogRepository.getLastActivityByUsers failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return map
  }

  private toRecord(model: AuditLog): AuditLogRecord {
    return {
      id: String(model.id),
      user_id: model.user_id !== null ? String(model.user_id) : null,
      action: model.action,
      entity_type: model.entity_type,
      entity_id: model.entity_id !== null ? String(model.entity_id) : null,
      old_values: (model.old_values as Record<string, unknown> | null) ?? null,
      new_values: (model.new_values as Record<string, unknown> | null) ?? null,
      ip_address: model.ip_address ?? null,
      user_agent: model.user_agent ?? null,
      created_at: model.created_at.toJSDate(),
    }
  }
}
