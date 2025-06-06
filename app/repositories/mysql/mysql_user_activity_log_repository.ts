import loggerService from '#services/logger_service'
import type {
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#repositories/interfaces'
import type { DatabaseId } from '#types/database'
import db from '@adonisjs/lucid/services/db'

/**
 * MySQL/PostgreSQL UserActivityLog Repository — raw query builder implementation.
 *
 * Uses raw query builder (no dedicated Lucid model for user_activity_logs).
 */

interface ActivityLogRow {
  id: DatabaseId
  user_id: DatabaseId
  action_type: string
  action_data: string | Record<string, unknown> | null
  related_entity_type: string | null
  related_entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string | Date
}

export default class MysqlUserActivityLogRepository implements UserActivityLogRepository {
  async create(data: UserActivityLogCreateData): Promise<void> {
    try {
      await db.table('user_activity_logs').insert({
        user_id: Number(data.user_id),
        action_type: data.action_type,
        action_data: data.action_data ? JSON.stringify(data.action_data) : null,
        related_entity_type: data.related_entity_type ?? null,
        related_entity_id: data.related_entity_id ? String(data.related_entity_id) : null,
        ip_address: data.ip_address ?? null,
        user_agent: data.user_agent ?? null,
        created_at: new Date(),
      })
    } catch (error) {
      loggerService.error('MysqlUserActivityLogRepository.create failed', {
        userId: data.user_id,
        actionType: data.action_type,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  async findByUser(
    userId: DatabaseId,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 50
    const offset = (page - 1) * limit

    const qb = db.from('user_activity_logs').where('user_id', userId).orderBy('created_at', 'desc')

    if (options?.actionType) {
      void qb.where('action_type', options.actionType)
    }

    // Count total
    const countResult = await db
      .from('user_activity_logs')
      .where('user_id', userId)
      .count('* as total')
    const countRow = countResult[0] as { total: string | number }
    const total = Number(countRow.total)

    // Fetch page
    const rows = (await qb.offset(offset).limit(limit)) as ActivityLogRow[]

    return {
      data: rows.map((row) => this.toRecord(row)),
      total,
    }
  }

  private toRecord(row: ActivityLogRow): UserActivityLogRecord {
    return {
      id: String(row.id),
      user_id: String(row.user_id),
      action_type: row.action_type,
      action_data:
        typeof row.action_data === 'string'
          ? (JSON.parse(row.action_data) as Record<string, unknown>)
          : (row.action_data ?? null),
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at instanceof Date ? row.created_at : new Date(row.created_at),
    }
  }
}
