import { CreateAuditLogCommand } from '#modules/audit/actions/commands/create_audit_log_command'
import { WriteAnonymousAuditLogCommand } from '#modules/audit/actions/commands/write_anonymous_audit_log_command'
import { WriteAuditLogCommand } from '#modules/audit/actions/commands/write_audit_log_command'
import type { AuditLogRepository } from '#modules/audit/actions/ports/outbound/audit_log_repository'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { AuditLogData } from '#modules/audit/public_contracts/audit_log_write_data'
import type {
  AuditLogWriter,
  AuditLogWriteAllowAnonymousInput,
  AuditLogWriteInput,
  AuditLogWriteOptions,
} from '#modules/audit/public_contracts/audit_log_writer'

export class AuditLogWriterAdapter implements AuditLogWriter {
  constructor(private readonly repository: Pick<AuditLogRepository, 'create'>) {}

  async log(
    data: AuditLogData,
    execCtx: AuditActionContext,
    options: AuditLogWriteOptions = {}
  ): Promise<boolean> {
    return new CreateAuditLogCommand(execCtx, {
      writer: (context, input, trx) =>
        new WriteAuditLogCommand(context, this.repository).execute(input, trx),
    }).execute(data, {
      ...(options.critical !== undefined ? { critical: options.critical } : {}),
      ...(options.trx ? { trx: options.trx } : {}),
    })
  }

  async write(execCtx: AuditActionContext, input: AuditLogWriteInput, trx?: object): Promise<void> {
    await new WriteAuditLogCommand(execCtx, this.repository).execute(input, trx)
  }

  async writeAllowAnonymous(
    execCtx: AuditActionContext,
    input: AuditLogWriteAllowAnonymousInput,
    trx?: object
  ): Promise<void> {
    await new WriteAnonymousAuditLogCommand(execCtx, this.repository).execute(input, trx)
  }
}
