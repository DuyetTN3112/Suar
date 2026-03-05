import type { AuditLogCreateData } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import { deriveAuditEventScopes } from '#modules/audit/domain/audit_event_scope'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import { redactAuditValue } from '#modules/audit/public_contracts/audit_event_redaction'
import type {
  AuditLogWriteAllowAnonymousInput,
  AuditLogWriteInput,
} from '#modules/audit/public_contracts/audit_log_writer'

const ORGANIZATION_OWNED_TARGET_TYPES = new Set([
  'billing_subscription',
  'organization_member',
  'organization_user',
  'project',
  'project_member',
  'project_professional_role',
  'project_professional_role_skill',
  'project_skill',
  'review',
  'review_dispute',
  'review_session',
  'sprint',
  'task',
  'task_application',
  'task_assignment',
  'task_status',
  'workflow',
])

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

const resolveTargetOrganizationId = (
  execCtx: AuditActionContext,
  input: AuditLogWriteInput | AuditLogWriteAllowAnonymousInput,
  targetType: string,
  targetId: string | null
): string | null => {
  if (input.target_organization_id !== undefined) {
    return input.target_organization_id
  }

  if (targetType === 'organization') {
    return targetId
  }

  return ORGANIZATION_OWNED_TARGET_TYPES.has(targetType) ? execCtx.organizationId : null
}

export function buildAuditLogCreateData(
  execCtx: AuditActionContext,
  input: AuditLogWriteInput | AuditLogWriteAllowAnonymousInput,
  effectiveUserId: string | null
): AuditLogCreateData {
  const oldValues = normalizeAuditValues(input.old_values)
  const newValues = normalizeAuditValues(input.new_values)
  const redactedOldValues = redactAuditValue(oldValues)
  const redactedNewValues = redactAuditValue(newValues)
  const targetType = input.target_type ?? input.entity_type
  const targetId = input.target_id ?? input.entity_id
  const targetOrganizationId = resolveTargetOrganizationId(execCtx, input, targetType, targetId)
  const scopes = deriveAuditEventScopes({
    actorUserId: effectiveUserId,
    targetType,
    targetId,
    targetOrganizationId,
    affectedUserIds: input.affected_user_ids ?? [],
  }).map((scope) => ({
    surface: scope.surface,
    user_id: scope.userId,
    organization_id: scope.organizationId,
  }))

  return {
    user_id: effectiveUserId,
    action: input.action,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    ip_address: execCtx.ip,
    user_agent: execCtx.userAgent,
    event_name: input.event_name ?? input.action,
    event_family: input.event_family ?? null,
    module: input.module ?? null,
    subsystem: input.subsystem ?? null,
    workflow: input.workflow ?? execCtx.workflowId ?? null,
    stage: input.stage ?? null,
    severity: input.severity ?? null,
    outcome: input.outcome ?? null,
    actor_type: input.actor_type ?? (effectiveUserId ? 'user' : 'system'),
    actor_user_id: effectiveUserId,
    actor_org_id: execCtx.organizationId,
    actor_role_surface: input.actor_role_surface ?? execCtx.actorRoleSurface ?? null,
    target_type: targetType,
    target_id: targetId,
    target_org_id: targetOrganizationId,
    request_id: execCtx.requestId ?? null,
    trace_id: execCtx.traceId ?? null,
    correlation_key: input.correlation_key ?? null,
    retention_class: input.retention_class ?? null,
    source_occurred_at: input.source_occurred_at ?? null,
    redaction_applied:
      input.redaction_applied === true ||
      redactedOldValues.redactionApplied ||
      redactedNewValues.redactionApplied,
    schema_version: input.source_occurred_at ? 3 : 2,
    critical: input.critical ?? false,
    scopes,
    ...(redactedOldValues.value !== null
      ? { old_values: redactedOldValues.value as Record<string, unknown> }
      : {}),
    ...(redactedNewValues.value !== null
      ? { new_values: redactedNewValues.value as Record<string, unknown> }
      : {}),
  }
}
