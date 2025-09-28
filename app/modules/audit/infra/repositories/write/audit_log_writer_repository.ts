import logger from '@adonisjs/core/services/logger'

import { auditRepositoryProvider } from '../audit_repository_provider.js'

export async function writeAuditLog(params: {
  userId: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  eventName?: string | null
  eventFamily?: string | null
  module?: string | null
  subsystem?: string | null
  workflow?: string | null
  stage?: string | null
  severity?: string | null
  outcome?: string | null
  actorType?: string | null
  actorUserId?: string | null
  actorOrgId?: string | null
  actorRoleSurface?: string | null
  targetType?: string | null
  targetId?: string | null
  targetOrgId?: string | null
  requestId?: string | null
  traceId?: string | null
  correlationKey?: string | null
  retentionClass?: string | null
  redactionApplied?: boolean
  critical?: boolean
  scopes?: {
    surface: 'system' | 'user' | 'organization'
    user_id: string | null
    organization_id: string | null
  }[]
}): Promise<void> {
  const oldValues = params.oldValues ?? null
  const newValues = params.newValues ?? null

  try {
    const repo = auditRepositoryProvider.getAuditLogRepository()
    await repo.create({
      user_id: params.userId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      old_values: oldValues,
      new_values: newValues,
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
      event_name: params.eventName ?? null,
      event_family: params.eventFamily ?? null,
      module: params.module ?? null,
      subsystem: params.subsystem ?? null,
      workflow: params.workflow ?? null,
      stage: params.stage ?? null,
      severity: params.severity ?? null,
      outcome: params.outcome ?? null,
      actor_type: params.actorType ?? null,
      actor_user_id: params.actorUserId ?? params.userId,
      actor_org_id: params.actorOrgId ?? null,
      actor_role_surface: params.actorRoleSurface ?? null,
      target_type: params.targetType ?? params.entityType,
      target_id: params.targetId ?? params.entityId,
      target_org_id: params.targetOrgId ?? null,
      request_id: params.requestId ?? null,
      trace_id: params.traceId ?? null,
      correlation_key: params.correlationKey ?? null,
      retention_class: params.retentionClass ?? null,
      redaction_applied: params.redactionApplied ?? false,
      schema_version: 2,
      scopes: params.scopes ?? [],
      critical: params.critical ?? false,
    })
  } catch (error) {
    if (params.critical) {
      throw error
    }

    logger.warn({ err: error }, 'Failed to create audit log')
  }
}
