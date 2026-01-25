import { BaseWriteAuditLogCommand } from '#modules/audit/actions/commands/base_write_audit_log_command'
import { buildAuditLogCreateData } from '#modules/audit/actions/mappers/audit_log_create_data_mapper'
import type {
  AuditLogRepository,
  AuditTransaction,
} from '#modules/audit/actions/ports/outbound/audit_log_repository'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import type { AuditLogWriteInput } from '#modules/audit/public_contracts/audit_log_writer'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export class WriteAuditLogCommand extends BaseWriteAuditLogCommand {
  constructor(
    private readonly execCtx: AuditActionContext,
    repository: Pick<AuditLogRepository, 'create'>
  ) {
    super(repository)
  }

  async execute(input: AuditLogWriteInput, trx?: AuditTransaction): Promise<void> {
    const effectiveUserId = input.user_id ?? this.execCtx.userId
    if (!effectiveUserId) {
      throw new InvariantViolationException(
        'Authenticated audit logging requires an actor user ID',
        {
          details: {
            action: input.action,
            entityType: input.entity_type,
          },
        }
      )
    }

    await this.persist(buildAuditLogCreateData(this.execCtx, input, effectiveUserId), trx)
  }
}
