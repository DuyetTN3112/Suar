import db from '@adonisjs/lucid/services/db'

import UserRepository from '../../../../users/infra/repositories/user_repository.js'
import { auditRepositoryProvider } from '../audit_repository_provider.js'

import {
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '#modules/pagination/public_contracts/pagination_public_api'
export interface AuditLogRecord {
  id: string
  user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  created_at: Date
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  event_name?: string | null
  event_family?: string | null
  module?: string | null
  subsystem?: string | null
  workflow?: string | null
  stage?: string | null
  severity?: string | null
  outcome?: string | null
  actor_type?: string | null
  actor_user_id?: string | null
  actor_org_id?: string | null
  actor_role_surface?: string | null
  target_type?: string | null
  target_id?: string | null
  target_org_id?: string | null
  request_id?: string | null
  trace_id?: string | null
  correlation_key?: string | null
  retention_class?: string | null
  redaction_applied?: boolean
  schema_version?: number
  event_hash?: string | null
  prev_hash?: string | null
}

export interface AdminAuditLogListParams {
  page: number
  perPage: number
  after?: string | null
  before?: string | null
  surface?: 'system' | 'organization' | 'user'
  actorUserId?: string
  organizationId?: string
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
  params: AdminAuditLogListParams,
  orgEntityIds: { projectIds: string[]; taskIds: string[] } = { projectIds: [], taskIds: [] }
): ReturnType<typeof db.from> => {
  let query = db.from('audit_events')

  const actorUserId = params.actorUserId
  if (params.surface === 'user' && actorUserId) {
    query = query.where((builder) => {
      void builder
        .whereIn(
          'id',
          db
            .from('audit_event_scopes')
            .select('event_id')
            .where('surface', 'user')
            .where('user_id', actorUserId)
        )
        .orWhere((legacy) => {
          void legacy
            .whereNotIn('id', db.from('audit_event_scopes').select('event_id'))
            .where((legacyUser) => {
              void legacyUser.where('user_id', actorUserId).orWhere((nested) => {
                void nested.where('entity_type', 'user').where('entity_id', actorUserId)
              })
            })
        })
    })
  }

  const organizationId = params.organizationId
  if (params.surface === 'organization' && organizationId) {
    query = query.where((builder) => {
      void builder
        .whereIn(
          'id',
          db
            .from('audit_event_scopes')
            .select('event_id')
            .where('surface', 'organization')
            .where('organization_id', organizationId)
        )
        .orWhere((legacy) => {
          void legacy
            .whereNotIn('id', db.from('audit_event_scopes').select('event_id'))
            .where((legacyOrg) => {
              void legacyOrg
                .where((nested) => {
                  void nested.where('entity_type', 'organization').where('entity_id', organizationId)
                })
                .orWhereRaw(
                  "(old_values->>'organization_id' = ? or new_values->>'organization_id' = ?)",
                  [organizationId, organizationId]
                )

              if (orgEntityIds.projectIds.length > 0) {
                void legacyOrg.orWhere((nested) => {
                  void nested
                    .where('entity_type', 'project')
                    .whereIn('entity_id', orgEntityIds.projectIds)
                })
              }

              if (orgEntityIds.taskIds.length > 0) {
                void legacyOrg.orWhere((nested) => {
                  void nested
                    .where('entity_type', 'task')
                    .whereIn('entity_id', orgEntityIds.taskIds)
                })
              }
            })
        })
    })
  }

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

async function resolveOrganizationAuditEntityIds(organizationId?: string): Promise<{
  projectIds: string[]
  taskIds: string[]
}> {
  if (!organizationId) {
    return { projectIds: [], taskIds: [] }
  }

  const [projectRows, taskRows] = await Promise.all([
    db.from('projects').where('organization_id', organizationId).select('id'),
    db.from('tasks').where('organization_id', organizationId).select('id'),
  ]) as [{ id: string }[], { id: string }[]]

  return {
    projectIds: projectRows.map((row) => row.id),
    taskIds: taskRows.map((row) => row.id),
  }
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
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}> {
  const perPage = Math.max(1, params.perPage)
  const orgEntityIds =
    params.surface === 'organization'
      ? await resolveOrganizationAuditEntityIds(params.organizationId)
      : { projectIds: [], taskIds: [] }
  const baseQuery = buildAdminAuditLogFilter(params, orgEntityIds)
  const decodedCursor = decodeTimestampCursor(params.after)
  const decodedBeforeCursor = decodeTimestampCursor(params.before)
  const pageQuery = baseQuery.clone()
  const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

  if (decodedCursor) {
    void pageQuery.where((builder) => {
      void builder
        .where('occurred_at', '<', decodedCursor.createdAt)
        .orWhere((nested) => {
          void nested.where('occurred_at', decodedCursor.createdAt).where('id', '<', decodedCursor.id)
        })
    })
  } else if (decodedBeforeCursor) {
    void pageQuery.where((builder) => {
      void builder
        .where('occurred_at', '>', decodedBeforeCursor.createdAt)
        .orWhere((nested) => {
          void nested.where('occurred_at', decodedBeforeCursor.createdAt).where('id', '>', decodedBeforeCursor.id)
        })
    })
  }

  const rows = (await pageQuery
    .orderBy('occurred_at', isBeforeWindow ? 'asc' : 'desc')
    .orderBy('id', isBeforeWindow ? 'asc' : 'desc')
    .limit(perPage + 1)) as {
    id: string
    user_id: string | null
    action: string
    entity_type: string
    entity_id: string | null
    old_values: Record<string, unknown> | null
    new_values: Record<string, unknown> | null
    ip_address: string | null
    user_agent: string | null
    event_name: string | null
    event_family: string | null
    module: string | null
    subsystem: string | null
    workflow: string | null
    stage: string | null
    severity: string | null
    outcome: string | null
    actor_type: string | null
    actor_user_id: string | null
    actor_org_id: string | null
    actor_role_surface: string | null
    target_type: string | null
    target_id: string | null
    target_org_id: string | null
    request_id: string | null
    trace_id: string | null
    correlation_key: string | null
    retention_class: string | null
    redaction_applied: boolean
    schema_version: number
    event_hash: string | null
    prev_hash: string | null
    occurred_at: Date | string
  }[]
  const hasOverflow = rows.length > perPage
  const windowRows = hasOverflow ? rows.slice(0, perPage) : rows
  const pageRows = isBeforeWindow ? [...windowRows].reverse() : windowRows
  const firstRow = pageRows[0]
  const lastRow = pageRows[pageRows.length - 1]
  const totalResult = (await baseQuery.clone().count('* as count').first()) as
    | { count?: number | string }
    | undefined
  const total = Number(totalResult?.count ?? 0)

  return {
    data: pageRows.map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      event_name: row.event_name,
      event_family: row.event_family,
      module: row.module,
      subsystem: row.subsystem,
      workflow: row.workflow,
      stage: row.stage,
      severity: row.severity,
      outcome: row.outcome,
      actor_type: row.actor_type,
      actor_user_id: row.actor_user_id,
      actor_org_id: row.actor_org_id,
      actor_role_surface: row.actor_role_surface,
      target_type: row.target_type,
      target_id: row.target_id,
      target_org_id: row.target_org_id,
      request_id: row.request_id,
      trace_id: row.trace_id,
      correlation_key: row.correlation_key,
      retention_class: row.retention_class,
      redaction_applied: row.redaction_applied,
      schema_version: row.schema_version,
      event_hash: row.event_hash,
      prev_hash: row.prev_hash,
      created_at: new Date(row.occurred_at),
    })),
    total,
    nextCursor:
      (isBeforeWindow || hasOverflow) && lastRow
        ? encodeTimestampCursor({
            createdAt: new Date(lastRow.occurred_at).toISOString(),
            id: lastRow.id,
          })
        : null,
    previousCursor:
      (decodedCursor || isBeforeWindow) && firstRow
        ? encodeTimestampCursor({
            createdAt: new Date(firstRow.occurred_at).toISOString(),
            id: firstRow.id,
          })
        : null,
    hasNextPage: isBeforeWindow ? Boolean(decodedBeforeCursor) : hasOverflow,
    hasPreviousPage: isBeforeWindow ? hasOverflow : Boolean(decodedCursor),
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
