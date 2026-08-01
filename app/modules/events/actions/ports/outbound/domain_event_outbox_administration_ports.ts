import type {
  DomainEventOutboxDeadLetterPreviewInput,
  DomainEventOutboxDeadLetterPreviewPage,
  DomainEventOutboxReplayBatch,
  DomainEventOutboxReplayInput,
} from '#modules/events/domain/domain_event_outbox_administration'
import type { DomainEventOutboxStatusSummary } from '#modules/events/public_contracts/domain_event_outbox_status'

export type DomainEventOutboxAdministrationTransaction = object

export abstract class DomainEventOutboxAdministrationRepository {
  abstract status(now: Date): Promise<DomainEventOutboxStatusSummary>
  abstract previewDeadLetters(
    input: DomainEventOutboxDeadLetterPreviewInput
  ): Promise<DomainEventOutboxDeadLetterPreviewPage>
  abstract replayDeadLetters(
    input: DomainEventOutboxReplayInput,
    trx: DomainEventOutboxAdministrationTransaction
  ): Promise<DomainEventOutboxReplayBatch>
}

export abstract class DomainEventOutboxAdministrationTransactionExecutor {
  abstract run<T>(
    callback: (trx: DomainEventOutboxAdministrationTransaction) => Promise<T>
  ): Promise<T>
}

export abstract class DomainEventOutboxAdministrationEvidenceGenerator {
  abstract newOperationId(): string
  abstract digest(value: string): string
}
