import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import {
  decodeTimestampCursor,
  encodeTimestampCursor,
  toOffset,
} from '#modules/pagination/public_contracts/pagination_public_api'
import type {
  UserActivityLogCreateData,
  UserActivityLogRecord,
  UserActivityLogRepository,
} from '#modules/user_activity/infra/repositories/user_activity_repository_interface'

interface UserActivityRow {
  id: string
  user_id: string
  action_type: string
  action_data: Record<string, unknown> | null
  related_entity_type: string | null
  related_entity_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: Date
}

export default class PostgresUserActivityLogRepository implements UserActivityLogRepository {
  async create(data: UserActivityLogCreateData): Promise<void> {
    await db.table('user_activity_events').insert({
      id: randomUUID(),
      user_id: data.user_id,
      action_type: data.action_type,
      action_data: data.action_data ?? null,
      related_entity_type: data.related_entity_type ?? null,
      related_entity_id: data.related_entity_id ?? null,
      ip_address: data.ip_address ?? null,
      user_agent: data.user_agent ?? null,
    })
  }

  async findByUser(
    userId: string,
    options?: { actionType?: string; limit?: number; page?: number }
  ): Promise<{ data: UserActivityLogRecord[]; total: number }> {
    const page = options?.page ?? 1
    const limit = options?.limit ?? 50
    const offset = toOffset(page, limit)
    let baseQuery = db.from('user_activity_events').where('user_id', userId)

    if (options?.actionType) {
      baseQuery = baseQuery.where('action_type', options.actionType)
    }

    const rows = (await baseQuery.clone().orderBy('created_at', 'desc').offset(offset).limit(limit)) as
      | UserActivityRow[]
    const totalResult = (await baseQuery.clone().count('* as count').first()) as
      | { count?: number | string }
      | undefined

    return {
      data: rows.map((row) => this.toRecord(row)),
      total: Number(totalResult?.count ?? 0),
    }
  }

  async findByUserCursor(
    userId: string,
    options?: { actionType?: string; limit?: number; after?: string | null; before?: string | null }
  ): Promise<{
    data: UserActivityLogRecord[]
    nextCursor: string | null
    previousCursor: string | null
    hasNextPage: boolean
    hasPreviousPage: boolean
  }> {
    const limit = Math.max(1, options?.limit ?? 50)
    let baseQuery = db.from('user_activity_events').where('user_id', userId)

    if (options?.actionType) {
      baseQuery = baseQuery.where('action_type', options.actionType)
    }

    const decodedCursor = decodeTimestampCursor(options?.after)
    const decodedBeforeCursor = decodeTimestampCursor(options?.before)
    const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

    if (decodedCursor) {
      baseQuery = baseQuery.where((builder) => {
        void builder
          .where('created_at', '<', decodedCursor.createdAt)
          .orWhere((nested) => {
            void nested.where('created_at', decodedCursor.createdAt).where('id', '<', decodedCursor.id)
          })
      })
    } else if (decodedBeforeCursor) {
      baseQuery = baseQuery.where((builder) => {
        void builder
          .where('created_at', '>', decodedBeforeCursor.createdAt)
          .orWhere((nested) => {
            void nested.where('created_at', decodedBeforeCursor.createdAt).where('id', '>', decodedBeforeCursor.id)
          })
      })
    }

    const rows = (await baseQuery
      .clone()
      .orderBy('created_at', isBeforeWindow ? 'asc' : 'desc')
      .orderBy('id', isBeforeWindow ? 'asc' : 'desc')
      .limit(limit + 1)) as UserActivityRow[]

    const hasOverflow = rows.length > limit
    const windowRows = hasOverflow ? rows.slice(0, limit) : rows
    const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
    const firstRow = pageRows[0]
    const lastRow = pageRows[pageRows.length - 1]

    return {
      data: pageRows.map((row) => this.toRecord(row)),
      nextCursor:
        (isBeforeWindow || hasOverflow) && lastRow
          ? encodeTimestampCursor({
              createdAt: lastRow.created_at.toISOString(),
              id: lastRow.id,
            })
          : null,
      previousCursor:
        (decodedCursor || isBeforeWindow) && firstRow
          ? encodeTimestampCursor({
              createdAt: firstRow.created_at.toISOString(),
              id: firstRow.id,
            })
          : null,
      hasNextPage: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
      hasPreviousPage: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
    }
  }

  private toRecord(row: UserActivityRow): UserActivityLogRecord {
    return {
      id: row.id,
      user_id: row.user_id,
      action_type: row.action_type,
      action_data: row.action_data,
      related_entity_type: row.related_entity_type,
      related_entity_id: row.related_entity_id,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: new Date(row.created_at),
    }
  }
}
