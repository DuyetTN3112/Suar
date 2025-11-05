import type { AuditActionContext } from '#modules/audit/actions/audit_action_context'
import { writeAuditLog as persistAuditLog } from '#modules/audit/infra/repositories/write/audit_log_writer_repository'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'

export interface WriteAuditLogInput {
  action: string
  entity_type: string
  entity_id: string
  user_id?: string
  old_values?: unknown
  new_values?: unknown
}

export interface WriteAuditLogAllowAnonymousInput {
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

  await persistAuditLog({
    userId: effectiveUserId,
    action: input.action,
    entityType: input.entity_type,
    entityId: input.entity_id,
    oldValues: normalizeAuditValues(input.old_values) ?? undefined,
    newValues: normalizeAuditValues(input.new_values) ?? undefined,
    ipAddress: execCtx.ip,
    userAgent: execCtx.userAgent,
  })
}

export async function writeAuditLogAllowAnonymous(
  execCtx: AuditActionContext,
  input: WriteAuditLogAllowAnonymousInput
): Promise<void> {
  await persistAuditLog({
    userId: input.user_id ?? execCtx.userId ?? null,
    action: input.action,
    entityType: input.entity_type,
    entityId: input.entity_id,
    oldValues: normalizeAuditValues(input.old_values) ?? undefined,
    newValues: normalizeAuditValues(input.new_values) ?? undefined,
    ipAddress: execCtx.ip,
    userAgent: execCtx.userAgent,
  })
}
