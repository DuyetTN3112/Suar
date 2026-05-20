import { requireDomainEventOutboxRetentionServicePrincipal } from '#modules/authorization/public_contracts/domain_event_outbox_retention_service_principal'
import type {
  DomainEventOutboxRetentionPreview,
  DomainEventOutboxRetentionWindowInput,
} from '#modules/events/actions/dtos/domain_event_outbox_retention'
import type { DomainEventOutboxRetentionRepository } from '#modules/events/actions/ports/outbound/domain_event_outbox_retention_repository'
import {
  DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
  resolveDomainEventOutboxRetentionCutoffs,
  summarizeDomainEventOutboxRetentionCounts,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox_retention_policy'

export class PreviewDomainEventOutboxRetentionQuery {
  constructor(private readonly repository: DomainEventOutboxRetentionRepository) {}

  async execute(
    input: DomainEventOutboxRetentionWindowInput
  ): Promise<DomainEventOutboxRetentionPreview> {
    requireDomainEventOutboxRetentionServicePrincipal(
      input.execution.operatorIdentity,
      input.execution.userId
    )
    const cutoffs = resolveDomainEventOutboxRetentionCutoffs({
      now: input.now ?? new Date(),
      processedRetentionDays: input.processedRetentionDays,
      replayHistoryRetentionDays: input.replayHistoryRetentionDays,
    })
    const counts = await this.repository.countDue({
      ...cutoffs,
      cap: DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
    })
    return { ...cutoffs, ...summarizeDomainEventOutboxRetentionCounts(counts) }
  }
}

