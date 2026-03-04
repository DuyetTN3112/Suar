import type { AuditTransaction } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { AuditLogData } from '#modules/audit/public_contracts/audit_log_write_data'
import type { AuditLogWriteInput } from '#modules/audit/public_contracts/audit_log_writer'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'

export interface AuditLogWriteOptions {
  trx?: AuditTransaction
  critical?: boolean
}

interface CreateAuditLogDependencies {
  writer: (
    execCtx: AuditActionContext,
    input: AuditLogWriteInput,
    trx?: AuditTransaction
  ) => Promise<void>
  operationalLogger?: Pick<typeof loggerService, 'logStructured'>
}

export class CreateAuditLogCommand {
  private readonly writer: CreateAuditLogDependencies['writer']
  private readonly operationalLogger: Pick<typeof loggerService, 'logStructured'>

  constructor(
    protected execCtx: AuditActionContext,
    dependencies: CreateAuditLogDependencies
  ) {
    this.writer = dependencies.writer
    this.operationalLogger = dependencies.operationalLogger ?? loggerService
  }

  async execute(data: AuditLogData, options: AuditLogWriteOptions = {}): Promise<boolean> {
    try {
      await this.writer(
        this.execCtx,
        {
          user_id: data.user_id,
          action: data.action,
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          old_values: data.old_values,
          new_values: data.new_values,
          ...(data.affected_user_ids ? { affected_user_ids: data.affected_user_ids } : {}),
          // Force the lower write command to propagate. This command owns the
          // boolean best-effort contract and must not report true after a
          // repository silently discarded the event.
          critical: true,
        },
        options.trx
      )
      return true
    } catch (error) {
      if (options.critical) {
        throw error
      }
      this.recordNoncriticalFailureSafely(error)
      return false
    }
  }

  private recordNoncriticalFailureSafely(error: unknown): void {
    try {
      const serializedError = serializeObservabilityError(error)
      this.operationalLogger.logStructured('warn', 'audit.write.noncritical_failed', {
        event_name: 'audit.write.noncritical_failed',
        module: 'audit',
        subsystem: 'audit_writer',
        workflow: 'audit_persistence',
        stage: 'write',
        outcome: 'warning',
        error: serializedError
          ? {
              class: serializedError['class'] ?? 'UnknownError',
            }
          : null,
        compliance: {
          redaction_applied: true,
          retention_class: 'transient_runtime',
          contains_sensitive_fields: false,
          contains_user_input: false,
        },
      })
    } catch {
      // A telemetry failure cannot turn a declared noncritical audit into a business failure.
    }
  }
}
