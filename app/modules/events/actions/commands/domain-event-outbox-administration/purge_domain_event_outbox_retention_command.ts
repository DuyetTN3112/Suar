import { requireDomainEventOutboxRetentionServicePrincipal } from '#modules/authorization/public_contracts/domain_event_outbox_retention_service_principal'
import type {
  DomainEventOutboxRetentionPurgeResult,
  DomainEventOutboxRetentionWindowInput,
} from '#modules/events/actions/dtos/domain_event_outbox_retention'
import type {
  DomainEventOutboxRetentionRepository,
  DomainEventOutboxRetentionTransaction,
} from '#modules/events/actions/ports/outbound/domain_event_outbox_retention_repository'
import {
  requireDomainEventOutboxRetentionMutation,
  resolveDomainEventOutboxRetentionCutoffs,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_retention_policy'

export class PurgeDomainEventOutboxRetentionCommand {
  constructor(private readonly repository: DomainEventOutboxRetentionRepository) {}

  async execute(
    input: DomainEventOutboxRetentionWindowInput & {
      batchSize: number
      reason: string
      confirmation: string
    },
    trx: DomainEventOutboxRetentionTransaction
  ): Promise<DomainEventOutboxRetentionPurgeResult> {
    requireDomainEventOutboxRetentionServicePrincipal(
      input.execution.operatorIdentity,
      input.execution.userId
    )
    const cutoffs = resolveDomainEventOutboxRetentionCutoffs({
      now: input.now ?? new Date(),
      processedRetentionDays: input.processedRetentionDays,
      replayHistoryRetentionDays: input.replayHistoryRetentionDays,
    })
    requireDomainEventOutboxRetentionMutation(input)

    const purgedProcessedRows = await this.repository.purgeProcessed(
      cutoffs.processedBefore,
      input.batchSize,
      trx
    )
    const purgedReplayHistoryRows = await this.repository.purgeReplayHistory(
      cutoffs.replayHistoryBefore,
      input.batchSize,
      trx
    )
    return {
      ...cutoffs,
      purgedProcessedRows,
      purgedReplayHistoryRows,
    }
  }
}

