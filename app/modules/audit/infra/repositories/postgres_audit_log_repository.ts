import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import type {
  AuditLogCreateData,
  AuditLogQuery,
  AuditLogRecord,
  AuditLogRepository,
} from '#modules/audit/infra/repositories/audit_log_repository_interface'
import loggerService from '#modules/logger/public_contracts/logger_service'

interface AuditEventRow {
  id: string
  user_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  occurred_at: Date
}

export default class PostgresAuditLogRepository implements AuditLogRepository {
  async create(data: AuditLogCreateData): Promise<void> {
    try {
      await db.table('audit_events').insert({
        id: randomUUID(),
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
      loggerService.error('PostgresAuditLogRepository.create failed', {
        action: data.action,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  async findMany(query: AuditLogQuery): Promise<{ data: AuditLogRecord[]; total: number }> {
    const page = query.page ?? 1
    const limit = query.limit ?? 50
    const offset = (page - 1) * limit
    const baseQuery = this.applyFilter(db.from('audit_events'), query)

    const rows = (await baseQuery.clone().orderBy('occurred_at', 'desc').offset(offset).limit(limit)) as
      | AuditEventRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async count(query: AuditLogQuery): Promise<number> {
    const result = (await this.applyFilter(db.from('audit_events'), query).count('* as count').first()) as
      | { count?: number | string }
      | undefined
    return Number(result?.count ?? 0)
  }

  async getLastActivityByUsers(
    entityType: string,
    entityId: string,
    userIds: string[]
  ): Promise<Map<string, Date | null>> {
    const result = new Map<string, Date | null>()
    if (userIds.length === 0) {
      return result
    }

    const rows = (await db
      .from('audit_events')
      .where('entity_type', entityType)
      .where('entity_id', entityId)
      .whereIn('user_id', userIds)
      .whereNotNull('user_id')
      .groupBy('user_id')
      .select('user_id')
      .max('occurred_at as last_active')) as { user_id: string; last_active: Date | string | null }[]

    for (const row of rows) {
      result.set(row.user_id, row.last_active ? new Date(row.last_active) : null)
    }

    return result
  }

  private applyFilter(queryBuilder: ReturnType<typeof db.from>, query: AuditLogQuery) {
    let builder = queryBuilder

    if (query.user_id !== undefined) {
      builder = builder.where('user_id', query.user_id)
    }
    if (query.entity_type !== undefined) {
      builder = builder.where('entity_type', query.entity_type)
    }
    if (query.entity_id !== undefined) {
      builder = builder.where('entity_id', query.entity_id)
    }
    if (query.action !== undefined) {
      builder = builder.where('action', query.action)
    }
    if (query.from) {
      builder = builder.where('occurred_at', '>=', query.from)
    }
    if (query.to) {
      builder = builder.where('occurred_at', '<=', query.to)
    }

    return builder
  }

  private toRecord(row: AuditEventRow): AuditLogRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: new Date(row.occurred_at),
    }
  }
}
