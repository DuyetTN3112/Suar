import { BaseCommand } from '#modules/audit/actions/base_command'
import type {
  AuditLogCreateData,
  AuditLogRepository,
  AuditTransaction,
} from '#modules/audit/actions/ports/outbound/audit_log_repository'
import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import loggerService from '#modules/logger/public_contracts/application_logger'

export abstract class BaseWriteAuditLogCommand extends BaseCommand {
  protected constructor(private readonly repository: Pick<AuditLogRepository, 'create'>) {
    super()
  }

  protected async persist(data: AuditLogCreateData, trx?: AuditTransaction): Promise<void> {
    try {
      await this.repository.create(data, trx)
    } catch (error) {
      if (data.critical) {
        throw error
      }
      loggerService.warn('Failed to create audit log', {
        error: serializeObservabilityError(error),
      })
    }
  }
}
