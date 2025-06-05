import { MongoAuditLogModel as MongoAuditLog } from '#models/mongo/audit_log'
import loggerService from '#services/logger_service'
import type { DatabaseId } from '#types/database'
import type {
  AuditLogCreateData,
  AuditLogQuery,
  AuditLogRecord,
  AuditLogRepository,
} from '#infra/shared/repositories/interfaces'
import type { Types } from 'mongoose'

/** Shape of a lean audit log document from MongoDB */
interface AuditLogLeanDoc {
  _id: Types.ObjectId
  user_id?: string
  action: string
  entity_type: string
  entity_id?: string
  old_values?: Record<string, unknown>
  new_values?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at?: Date
}

/**
 * MongoDB AuditLog Repository — Mongoose implementation.
 *
 * Optimized for high-volume writes, time-range queries, auto-expiry (TTL 365 days).
 * IDs stored as strings (compatible with both INT and UUIDv7).
 */
export default class MongoAuditLogRepository implements AuditLogRepository {
  async create(data: AuditLogCreateData): Promise<void> {
    try {
      const doc: Record<string, unknown> = {
        user_id: data.user_id !== null ? String(data.user_id) : undefined,
        action: data.action,
        entity_type: data.entity_type,
        entity_id:
          data.entity_id !== null && data.entity_id !== undefined
            ? String(data.entity_id)
            : undefined,
        old_values: data.old_values ?? undefined,
        new_values: data.new_values ?? undefined,
        ip_address: data.ip_address ?? undefined,
        user_agent: data.user_agent ?? undefined,
      }
      await MongoAuditLog.create(doc as Parameters<typeof MongoAuditLog.create>[0])
    } catch (error) {
      loggerService.error('MongoAuditLogRepository.create failed', {
        action: data.action,
        error: error instanceof Error ? error.message : String(error),
      })
      // Don't throw — audit logging should never block business operations
    }
  }

  async findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 50
    const skip = (page - 1) * limit

    const filter = this.buildFilter(query)

    const [rawDocs, total] = await Promise.all([
      MongoAuditLog.find(filter).sort({ created_at: -1 }).skip(skip).limit(limit).lean().exec(),
      MongoAuditLog.countDocuments(filter).exec(),
    ])

    const docs = rawDocs as unknown as AuditLogLeanDoc[]

    return {
      data: docs.map((doc) => this.toRecord(doc)),
      total,
    }
  }

  async count(query: AuditLogQuery): Promise<number> {
    const filter = this.buildFilter(query)
    return MongoAuditLog.countDocuments(filter).exec()
  }

  private buildFilter(query: AuditLogQuery): Record<string, string | Record<string, Date>> {
    const filter: Record<string, string | Record<string, Date>> = {}

    if (query.user_id !== undefined) {
      filter.user_id = String(query.user_id)
    }
    if (query.entity_type !== undefined) {
      filter.entity_type = query.entity_type
    }
    if (query.entity_id !== undefined) {
      filter.entity_id = String(query.entity_id)
    }
    if (query.action !== undefined) {
      filter.action = query.action
    }
    if (query.from ?? query.to) {
      const dateFilter: Record<string, Date> = {}
      if (query.from) dateFilter.$gte = query.from
      if (query.to) dateFilter.$lte = query.to
      filter.created_at = dateFilter
    }

    return filter
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: DatabaseId,
    userIds: DatabaseId[]
  ): Promise<Map<string, Date | null>> {
    const map = new Map<string, Date | null>()
    if (userIds.length === 0) return map

    try {
      const results = await MongoAuditLog.aggregate([
        {
          $match: {
            entity_type: entityType,
            entity_id: String(entityId),
            user_id: { $in: userIds.map(String) },
          },
        },
        { $group: { _id: '$user_id', last_active: { $max: '$created_at' } } },
      ])

      for (const row of results as Array<{ _id: string; last_active: Date }>) {
        map.set(row._id, row.last_active)
      }
    } catch (error) {
      loggerService.error('MongoAuditLogRepository.getLastActivityByUsers failed', {
        error: error instanceof Error ? error.message : String(error),
      })
    }

    return map
  }

  private toRecord(doc: AuditLogLeanDoc): AuditLogRecord {
    return {
      id: String(doc._id),
      user_id: doc.user_id ?? null,
      action: doc.action,
      entity_type: doc.entity_type,
      entity_id: doc.entity_id ?? null,
      old_values: doc.old_values ?? null,
      new_values: doc.new_values ?? null,
      ip_address: doc.ip_address ?? null,
      user_agent: doc.user_agent ?? null,
      created_at: doc.created_at ?? new Date(),
    }
  }
}
