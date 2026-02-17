import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { redactAuditValue } from '#modules/audit/domain/audit_event_redaction'
import { deriveAuditEventScopes } from '#modules/audit/domain/audit_event_scope'
import { writeAuditLog as persistAuditLog } from '#modules/audit/infra/repositories/write/audit_log_writer_repository'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export interface WriteAuditLogEnterpriseInput {
  event_name?: string
  event_family?: string
  module?: string
  subsystem?: string
  workflow?: string
  stage?: string
  severity?: string
  outcome?: string
  actor_type?: string
  actor_role_surface?: string
  target_type?: string
  target_id?: string
  target_organization_id?: string | null
  correlation_key?: string
  retention_class?: string
  affected_user_ids?: string[]
  critical?: boolean
}

export interface WriteAuditLogInput extends WriteAuditLogEnterpriseInput {
  action: string
  entity_type: string
  entity_id: string
  user_id?: string
  old_values?: unknown
  new_values?: unknown
}

export interface WriteAuditLogAllowAnonymousInput extends WriteAuditLogEnterpriseInput {
  action: string
  entity_type: string
  entity_id: string | null
  user_id?: string | null
  old_values?: unknown
  new_values?: unknown
}

const isAuditRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const normalizeAuditValues = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown
      return isAuditRecord(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return isAuditRecord(value) ? value : null
}

export async function writeAuditLog(
  execCtx: AuditActionContext,
  input: WriteAuditLogInput
): Promise<void> {
  const effectiveUserId = input.user_id ?? execCtx.userId
  if (!effectiveUserId) {
    throw new BusinessLogicException('user_id is required for audit logging')
  }
  const oldValues = normalizeAuditValues(input.old_values)
  const newValues = normalizeAuditValues(input.new_values)
  const redactedOldValues = redactAuditValue(oldValues)
  const redactedNewValues = redactAuditValue(newValues)
  const targetType = input.target_type ?? input.entity_type
  const targetId = input.target_id ?? input.entity_id
  const targetOrganizationId = input.target_organization_id ?? execCtx.organizationId ?? null
  const scopes = deriveAuditEventScopes({
    actorUserId: effectiveUserId,
    actorOrganizationId: execCtx.organizationId,
    targetType,
    targetId,
    targetOrganizationId,
    affectedUserIds: input.affected_user_ids ?? [],
  }).map((scope) => ({
    surface: scope.surface,
    user_id: scope.userId,
    organization_id: scope.organizationId,
  }))

  await persistAuditLog({
    userId: effectiveUserId,
    action: input.action,
    entityType: input.entity_type,
    entityId: input.entity_id,
    ipAddress: execCtx.ip,
    userAgent: execCtx.userAgent,
    eventName: input.event_name ?? input.action,
    eventFamily: input.event_family ?? null,
    module: input.module ?? null,
    subsystem: input.subsystem ?? null,
    workflow: input.workflow ?? execCtx.workflowId ?? null,
    stage: input.stage ?? null,
    severity: input.severity ?? null,
    outcome: input.outcome ?? null,
    actorType: input.actor_type ?? 'user',
    actorUserId: effectiveUserId,
    actorOrgId: execCtx.organizationId,
    actorRoleSurface: input.actor_role_surface ?? null,
    targetType,
    targetId,
    targetOrgId: targetOrganizationId,
    requestId: execCtx.requestId ?? null,
    traceId: execCtx.traceId ?? null,
    correlationKey: input.correlation_key ?? null,
    retentionClass: input.retention_class ?? null,
    redactionApplied: redactedOldValues.redactionApplied || redactedNewValues.redactionApplied,
    critical: input.critical ?? false,
    scopes,
    ...(redactedOldValues.value !== null ? { oldValues: redactedOldValues.value as Record<string, unknown> } : {}),
    ...(redactedNewValues.value !== null ? { newValues: redactedNewValues.value as Record<string, unknown> } : {}),
  })
}

export async function writeAuditLogAllowAnonymous(
  execCtx: AuditActionContext,
  input: WriteAuditLogAllowAnonymousInput
): Promise<void> {
  const oldValues = normalizeAuditValues(input.old_values)
  const newValues = normalizeAuditValues(input.new_values)
  const redactedOldValues = redactAuditValue(oldValues)
  const redactedNewValues = redactAuditValue(newValues)
  const effectiveUserId = input.user_id ?? execCtx.userId ?? null
  const targetType = input.target_type ?? input.entity_type
  const targetId = input.target_id ?? input.entity_id
  const targetOrganizationId = input.target_organization_id ?? execCtx.organizationId ?? null
  const scopes = deriveAuditEventScopes({
    actorUserId: effectiveUserId,
    actorOrganizationId: execCtx.organizationId,
    targetType,
    targetId,
    targetOrganizationId,
    affectedUserIds: input.affected_user_ids ?? [],
  }).map((scope) => ({
    surface: scope.surface,
    user_id: scope.userId,
    organization_id: scope.organizationId,
  }))

  await persistAuditLog({
    userId: effectiveUserId,
    action: input.action,
    entityType: input.entity_type,
    entityId: input.entity_id,
    ipAddress: execCtx.ip,
    userAgent: execCtx.userAgent,
    eventName: input.event_name ?? input.action,
    eventFamily: input.event_family ?? null,
    module: input.module ?? null,
    subsystem: input.subsystem ?? null,
    workflow: input.workflow ?? execCtx.workflowId ?? null,
    stage: input.stage ?? null,
    severity: input.severity ?? null,
    outcome: input.outcome ?? null,
    actorType: input.actor_type ?? (effectiveUserId ? 'user' : 'system'),
    actorUserId: effectiveUserId,
    actorOrgId: execCtx.organizationId,
    actorRoleSurface: input.actor_role_surface ?? null,
    targetType,
    targetId,
    targetOrgId: targetOrganizationId,
    requestId: execCtx.requestId ?? null,
    traceId: execCtx.traceId ?? null,
    correlationKey: input.correlation_key ?? null,
    retentionClass: input.retention_class ?? null,
    redactionApplied: redactedOldValues.redactionApplied || redactedNewValues.redactionApplied,
    critical: input.critical ?? false,
    scopes,
    ...(redactedOldValues.value !== null ? { oldValues: redactedOldValues.value as Record<string, unknown> } : {}),
    ...(redactedNewValues.value !== null ? { newValues: redactedNewValues.value as Record<string, unknown> } : {}),
  })
}
