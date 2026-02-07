import { BaseWriteAuditLogCommand } from '#modules/audit/actions/commands/base_write_audit_log_command'
import { buildAuditLogCreateData } from '#modules/audit/actions/mappers/audit_log_create_data_mapper'
import type {
  AuditLogRepository,
  AuditTransaction,
} from '#modules/audit/actions/ports/outbound/audit_log_repository'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { AuditLogWriteAllowAnonymousInput } from '#modules/audit/public_contracts/audit_log_writer'

export class WriteAnonymousAuditLogCommand extends BaseWriteAuditLogCommand {
  constructor(
    private readonly execCtx: AuditActionContext,
    repository: Pick<AuditLogRepository, 'create'>
  ) {
    super(repository)
  }

  async execute(input: AuditLogWriteAllowAnonymousInput, trx?: AuditTransaction): Promise<void> {
    const effectiveUserId = input.user_id ?? this.execCtx.userId ?? null
    await this.persist(buildAuditLogCreateData(this.execCtx, input, effectiveUserId), trx)
  }
}
