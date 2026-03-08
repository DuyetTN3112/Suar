import { requireErrorEventServicePrincipalIdentity } from '#modules/authorization/public_contracts/error_event_service_principal'
import type {
  ErrorEventRetentionExecutionContext,
  ErrorEventRetentionPreview,
} from '#modules/errors/actions/dtos/error_event_retention'
import type { ErrorEventRetentionRepository } from '#modules/errors/actions/ports/outbound/error_event_retention_repository'
import {
  ERROR_EVENT_RETENTION_COUNT_CAP,
  resolveErrorEventRetentionCutoff,
  summarizeErrorEventRetentionDueCount,
} from '#modules/errors/domain/error_event_retention_policy'

export class PreviewErrorEventRetentionQuery {
  constructor(private readonly repository: ErrorEventRetentionRepository) {}

  async execute(input: {
    now?: Date
    retentionDays: number
    execution: ErrorEventRetentionExecutionContext
  }): Promise<ErrorEventRetentionPreview> {
    requireErrorEventServicePrincipalIdentity(
      input.execution.operatorIdentity,
      input.execution.userId
    )
    const cutoff = resolveErrorEventRetentionCutoff(input.now ?? new Date(), input.retentionDays)
    const boundedCount = await this.repository.countDue(cutoff, ERROR_EVENT_RETENTION_COUNT_CAP)

    return { cutoff, ...summarizeErrorEventRetentionDueCount(boundedCount) }
  }
}
