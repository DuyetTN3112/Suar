import db from '@adonisjs/lucid/services/db'

import UserRepository from '../../../../users/infra/repositories/user_repository.js'
import { auditRepositoryProvider } from '../audit_repository_provider.js'


export interface AuditLogRecord {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
}

export interface AdminAuditLogListParams {
  page: number
  perPage: number
  search?: string
  action?: string
  resourceType?: string
  userId?: string
  from?: Date
  to?: Date
  searchMatchedUserIds?: string[]
}

export interface AdminAuditLogRecord extends AuditLogRecord {
  ip_address: string | null
  user_agent: string | null
}

export type AuditUserField = 'id' | 'username' | 'email'

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const buildAdminAuditLogFilter = (
  params: AdminAuditLogListParams
): ReturnType<typeof db.from> => {
  let query = db.from('audit_events')

  if (params.action) {
    query = query.where('action', params.action)
  }

  if (params.resourceType) {
    query = query.where('entity_type', params.resourceType)
  }

  if (params.userId) {
    query = query.where('user_id', params.userId)
  }

  if (params.from) {
    query = query.where('occurred_at', '>=', params.from)
  }

  if (params.to) {
    query = query.where('occurred_at', '<=', params.to)
  }

  const search = params.search?.trim()
  if (search) {
    const normalized = `%${escapeRegex(search).replace(/[%_]/g, '\\$&')}%`
    const matchedUserIds = params.searchMatchedUserIds ?? []
    query = query.where((builder) => {
      let scopedBuilder = builder
        .whereILike('action', normalized)
        .orWhereILike('entity_type', normalized)
        .orWhereILike('entity_id', normalized)
        .orWhereILike('ip_address', normalized)

      if (matchedUserIds.length > 0) {
        scopedBuilder = scopedBuilder.orWhereIn('user_id', matchedUserIds)
      }

      return scopedBuilder
    })
  }

  return query
}

export async function listAuditLogsByEntity(
  entityType: string,
  entityId: string,
  limit: number
): Promise<AuditLogRecord[]> {
  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  const { data: logs } = await auditRepo.findMany({
    entity_type: entityType,
    entity_id: entityId,
    limit,
  })

  return logs
}

export async function listAdminAuditLogs(params: AdminAuditLogListParams): Promise<{
  data: AdminAuditLogRecord[]
  total: number
}> {
  const page = Math.max(1, params.page)
  const perPage = Math.max(1, params.perPage)
  const offset = (page - 1) * perPage
  const baseQuery = buildAdminAuditLogFilter(params)

  const rows = (await baseQuery.clone().orderBy('occurred_at', 'desc').offset(offset).limit(perPage)) as {
    id: string
    user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    occurred_at: Date | string
  }[]
  const totalResult = (await baseQuery.clone().count('* as count').first()) as
    | { count?: number | string }
    | undefined
  const total = Number(totalResult?.count ?? 0)

  return {
    data: rows.map((row) => ({
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
    })),
    total,
  }
}

export async function getLastAuditActivityByUsers(
  entityType: string,
  entityId: string,
  userIds: string[]
): Promise<Map<string, Date | null>> {
  if (userIds.length === 0) {
    return new Map<string, Date | null>()
  }

  const auditRepo = auditRepositoryProvider.getAuditLogRepository()
  return await auditRepo.getLastActivityByUsers(entityType, entityId, userIds)
}

export async function getAuditUsersByIds(
  userIds: string[],
  fields: AuditUserField[] = ['id', 'username', 'email']
): Promise<{ id: string; username: string | null; email: string | null }[]> {
  return await UserRepository.findByIds(userIds, fields)
}
