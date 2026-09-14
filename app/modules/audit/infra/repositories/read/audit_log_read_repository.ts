import db from '@adonisjs/lucid/services/db'

import { auditRepositoryProvider } from '../audit-log/audit_repository_provider.js'

import type {
  AdminAuditLogListParams,
  AdminAuditLogRecord,
  AuditLogRecord,
} from '#modules/audit/public_contracts/audit_read_contract'
import {
  decodeTimestampCursor,
  encodeTimestampCursor,
} from '#modules/pagination/public_contracts/pagination_public_api'

const escapeRegex = (value: string): string => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const toAuditSearchPattern = (value: string): string => {
  return `%${escapeRegex(value).replace(/[%_]/g, '\\$&')}%`
}

type AuditQueryBuilder = ReturnType<typeof db.from>

const applyUserSurfaceFilter = (
  query: AuditQueryBuilder,
  actorUserId: string
): AuditQueryBuilder => {
  return query
    .where((builder) => {
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
    .where((builder) => {
      void builder
        .whereNull('retention_class')
        .orWhereNotIn('retention_class', ['support_trace', 'transient_runtime'])
    })
}

const applyLegacyOrganizationTargets = (
  legacyOrg: any,
  organizationId: string,
  targets: NonNullable<AdminAuditLogListParams['organizationScopedTargets']>
): void => {
  void legacyOrg
    .where((nested: any) => {
      void nested.where('entity_type', 'organization').where('entity_id', organizationId)
    })
    .orWhereRaw("(old_values->>'organization_id' = ? or new_values->>'organization_id' = ?)", [
      organizationId,
      organizationId,
    ])

  for (const targetSet of targets) {
    if (targetSet.ids.length === 0) continue
    void legacyOrg.orWhere((nested: any) => {
      void nested.where('entity_type', targetSet.type).whereIn('entity_id', targetSet.ids)
    })
  }
}

const applyOrganizationSurfaceFilter = (
  query: AuditQueryBuilder,
  organizationId: string,
  targets: AdminAuditLogListParams['organizationScopedTargets'] = []
): AuditQueryBuilder => {
  return query.where((builder) => {
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
            applyLegacyOrganizationTargets(legacyOrg, organizationId, targets ?? [])
          })
      })
  })
}

const applyMetadataFilters = (
  query: AuditQueryBuilder,
  params: AdminAuditLogListParams
): AuditQueryBuilder => {
  let filteredQuery = query

  if (params.action) {
    const action = params.action
    filteredQuery = filteredQuery.where((builder) => {
      void builder.where('action', action).orWhere('event_name', action)
    })
  }

  if (params.resourceType) {
    filteredQuery = filteredQuery.whereRaw('coalesce(target_type, entity_type) = ?', [params.resourceType])
  }

  if (params.module) {
    filteredQuery = filteredQuery.where('module', params.module)
  }

  if (params.workflow) {
    filteredQuery = filteredQuery.where('workflow', params.workflow)
  }

  if (params.severity) {
    filteredQuery = filteredQuery.where('severity', params.severity)
  }

  if (params.outcome) {
    if (params.outcome === 'recorded') {
      filteredQuery = filteredQuery.where((builder) => {
        void builder.whereNull('outcome').orWhereNotIn('outcome', ['success', 'warning', 'failure'])
      })
    } else {
      filteredQuery = filteredQuery.where('outcome', params.outcome)
    }
  }

  if (params.actorType) {
    filteredQuery = filteredQuery.whereRaw("coalesce(actor_type, 'user') = ?", [params.actorType])
  }

  if (params.retentionClass) {
    filteredQuery = filteredQuery.where('retention_class', params.retentionClass)
  }

  if (params.traceId) {
    filteredQuery = filteredQuery.where('trace_id', params.traceId)
  }

  if (params.userId && params.surface !== 'user') {
    filteredQuery = filteredQuery.whereRaw('coalesce(actor_user_id, user_id) = ?', [params.userId])
  }

  if (params.from) {
    filteredQuery = filteredQuery.where('occurred_at', '>=', params.from)
  }

  if (params.to) {
    filteredQuery = filteredQuery.where('occurred_at', '<=', params.to)
  }

  return filteredQuery
}

const applyOrganizationSearchTargets = (
  scopedBuilder: any,
  targets: NonNullable<AdminAuditLogListParams['searchMatchedTargets']>,
  normalized: string
): any => {
  let builder = scopedBuilder
    .orWhereRaw("old_values->>'title' ilike ? escape '\\'", [normalized])
    .orWhereRaw("new_values->>'title' ilike ? escape '\\'", [normalized])
    .orWhereRaw("old_values->>'name' ilike ? escape '\\'", [normalized])
    .orWhereRaw("new_values->>'name' ilike ? escape '\\'", [normalized])

  for (const targetSet of targets) {
    if (targetSet.ids.length === 0) continue

    builder = builder.orWhere((targetBuilder: any) => {
      void targetBuilder
        .whereRaw('coalesce(target_type, entity_type) = ?', [targetSet.type])
        .where((targetIdBuilder: any) => {
          void targetIdBuilder.whereIn('target_id', targetSet.ids).orWhere((legacyTarget: any) => {
            void legacyTarget.whereNull('target_id').whereIn('entity_id', targetSet.ids)
          })
        })
    })
  }
  return builder
}

const applySystemSearchFields = (scopedBuilder: any, normalized: string): any => {
  return scopedBuilder
    .orWhereILike('subsystem', normalized)
    .orWhereILike('workflow', normalized)
    .orWhereILike('stage', normalized)
    .orWhereILike('severity', normalized)
    .orWhereILike('outcome', normalized)
    .orWhereILike('actor_type', normalized)
    .orWhereILike('actor_role_surface', normalized)
    .orWhereILike('request_id', normalized)
    .orWhereILike('trace_id', normalized)
    .orWhereILike('correlation_key', normalized)
    .orWhereILike('retention_class', normalized)
    .orWhereILike('ip_address', normalized)
    .orWhereILike('user_agent', normalized)
}

const applyAuditSearchFilter = (
  query: AuditQueryBuilder,
  params: AdminAuditLogListParams
): AuditQueryBuilder => {
  const search = params.search?.trim()
  if (!search) {
    return query
  }

  const normalized = toAuditSearchPattern(search)
  const matchedUserIds = params.searchMatchedUserIds ?? []

  return query.where((builder) => {
    let scopedBuilder = builder
      .whereILike('action', normalized)
      .orWhereILike('event_name', normalized)
      .orWhereILike('event_family', normalized)
      .orWhereILike('module', normalized)
      .orWhereILike('entity_type', normalized)
      .orWhereILike('target_type', normalized)

    if (params.surface !== 'user') {
      scopedBuilder = scopedBuilder
        .orWhereILike('entity_id', normalized)
        .orWhereILike('target_id', normalized)
    }

    if (params.surface === 'organization') {
      scopedBuilder = applyOrganizationSearchTargets(
        scopedBuilder,
        params.searchMatchedTargets ?? [],
        normalized
      )
    }

    if (!params.surface || params.surface === 'system') {
      scopedBuilder = applySystemSearchFields(scopedBuilder, normalized)
    }

    if (params.surface !== 'user' && matchedUserIds.length > 0) {
      scopedBuilder = scopedBuilder
        .orWhereIn('user_id', matchedUserIds)
        .orWhereIn('actor_user_id', matchedUserIds)
    }

    return scopedBuilder
  })
}

const buildAdminAuditLogFilter = (params: AdminAuditLogListParams): AuditQueryBuilder => {
  let query: AuditQueryBuilder = db.from('audit_events')

  if (params.surface === 'user' && params.actorUserId) {
    query = applyUserSurfaceFilter(query, params.actorUserId)
  }

  if (params.surface === 'organization' && params.organizationId) {
    query = applyOrganizationSurfaceFilter(
      query,
      params.organizationId,
      params.organizationScopedTargets
    )
  }

  query = applyMetadataFilters(query, params)
  query = applyAuditSearchFilter(query, params)

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
  nextCursor: string | null
  previousCursor: string | null
  hasNextPage: boolean
  hasPreviousPage: boolean
}> {
  const perPage = Math.max(1, params.perPage)
  const baseQuery = buildAdminAuditLogFilter(params)
  const decodedCursor = decodeTimestampCursor(params.after)
  const decodedBeforeCursor = decodeTimestampCursor(params.before)
  const pageQuery = baseQuery.clone()
  const isBeforeWindow = Boolean(decodedBeforeCursor && !decodedCursor)

  if (decodedCursor) {
    void pageQuery.where((builder) => {
      void builder.where('occurred_at', '<', decodedCursor.createdAt).orWhere((nested) => {
        void nested.where('occurred_at', decodedCursor.createdAt).where('id', '<', decodedCursor.id)
      })
    })
  } else if (decodedBeforeCursor) {
    void pageQuery.where((builder) => {
      void builder.where('occurred_at', '>', decodedBeforeCursor.createdAt).orWhere((nested) => {
        void nested
          .where('occurred_at', decodedBeforeCursor.createdAt)
          .where('id', '>', decodedBeforeCursor.id)
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
    source_occurred_at: Date | string | null
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
      source_occurred_at: row.source_occurred_at ? new Date(row.source_occurred_at) : null,
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

export const postgresAuditLogReadRepository = {
  listByEntity: listAuditLogsByEntity,
  listAdmin: listAdminAuditLogs,
  getLastActivityByUsers: getLastAuditActivityByUsers,
} as const
