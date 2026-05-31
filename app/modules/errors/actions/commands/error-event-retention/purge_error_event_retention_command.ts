import { requireErrorEventServicePrincipalIdentity } from '#modules/authorization/public_contracts/error_event_service_principal'
import { BaseCommand } from '#modules/errors/actions/base_command'
import type { ErrorEventRetentionExecutionContext } from '#modules/errors/actions/dtos/error-event-retention/error_event_retention'
import type {
  ErrorEventRetentionRepository,
  ErrorEventRetentionTransaction,
} from '#modules/errors/actions/ports/outbound/error-event-retention/error_event_retention_repository'
import {
  normalizeErrorEventRetentionReason,
  requireErrorEventRetentionBatchSize,
  requireErrorEventRetentionConfirmation,
  resolveErrorEventRetentionCutoff,
} from '#modules/errors/domain/error-event-retention/error_event_retention_policy'

export class PurgeErrorEventRetentionCommand extends BaseCommand<
  [
    input: {
      now?: Date
      retentionDays: number
      batchSize: number
      reason: string
      confirmation: string
      execution: ErrorEventRetentionExecutionContext
    },
    trx?: ErrorEventRetentionTransaction,
  ],
  { cutoff: Date; purgedCount: number }
> {
  constructor(private readonly repository: ErrorEventRetentionRepository) {
    super()
  }

  async execute(
    input: {
      now?: Date
      retentionDays: number
      batchSize: number
      reason: string
      confirmation: string
      execution: ErrorEventRetentionExecutionContext
    },
    trx?: ErrorEventRetentionTransaction
  ): Promise<{ cutoff: Date; purgedCount: number }> {
    requireErrorEventServicePrincipalIdentity(
      input.execution.operatorIdentity,
      input.execution.userId
    )
    requireErrorEventRetentionBatchSize(input.batchSize)
    normalizeErrorEventRetentionReason(input.reason)
    requireErrorEventRetentionConfirmation(input.confirmation)
    const cutoff = resolveErrorEventRetentionCutoff(input.now ?? new Date(), input.retentionDays)
    const purgedCount = await this.repository.purgeDue(cutoff, input.batchSize, trx)
    return { cutoff, purgedCount }
  }
}
