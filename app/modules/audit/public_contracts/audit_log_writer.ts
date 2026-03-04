import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { AuditLogData } from '#modules/audit/public_contracts/audit_log_write_data'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export interface AuditLogEnterpriseInput {
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
  source_occurred_at?: Date | null
  redaction_applied?: boolean
  affected_user_ids?: string[]
  critical?: boolean
}

export interface AuditLogWriteInput extends AuditLogEnterpriseInput {
  action: string
  entity_type: string
  entity_id: string
  user_id?: string
  old_values?: unknown
  new_values?: unknown
}

export interface AuditLogWriteAllowAnonymousInput extends AuditLogEnterpriseInput {
  action: string
  entity_type: string
  entity_id: string | null
  user_id?: string | null
  old_values?: unknown
  new_values?: unknown
}

export interface AuditLogWriteOptions {
  trx?: object
  critical?: boolean
}

export interface AuditLogWriter {
  log(
    data: AuditLogData,
    execCtx: AuditActionContext,
    options?: AuditLogWriteOptions
  ): Promise<boolean>
  write(execCtx: AuditActionContext, input: AuditLogWriteInput, trx?: object): Promise<void>
  writeAllowAnonymous(
    execCtx: AuditActionContext,
    input: AuditLogWriteAllowAnonymousInput,
    trx?: object
  ): Promise<void>
}

let registeredWriter: AuditLogWriter | undefined

export function registerAuditLogWriter(nextWriter: AuditLogWriter): void {
  if (registeredWriter && registeredWriter !== nextWriter) {
    throw new InvariantViolationException('Audit log writer is already registered')
  }
  registeredWriter = nextWriter
}

function requireWriter(): AuditLogWriter {
  if (!registeredWriter) {
    throw new InvariantViolationException('Audit log writer has not been registered')
  }
  return registeredWriter
}

export const auditPublicApi: AuditLogWriter = {
  log: (data, execCtx, options) => requireWriter().log(data, execCtx, options),
  write: (execCtx, input, trx) => requireWriter().write(execCtx, input, trx),
  writeAllowAnonymous: (execCtx, input, trx) =>
    requireWriter().writeAllowAnonymous(execCtx, input, trx),
}

export type { AuditLogData }
