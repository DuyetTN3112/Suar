import BusinessLogicException from '#exceptions/business_logic_exception'
import { writeAuditLog as persistAuditLog } from '#infra/audit/repositories/write/audit_log_writer_repository'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface WriteAuditLogInput {
  action: string
  entity_type: string
  entity_id: DatabaseId
  user_id?: DatabaseId
  old_values?: unknown
  new_values?: unknown
}

export interface WriteAuditLogAllowAnonymousInput {
  action: string
  entity_type: string
  entity_id: DatabaseId | null
  user_id?: DatabaseId | null
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
  execCtx: ExecutionContext,
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
  execCtx: ExecutionContext,
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
