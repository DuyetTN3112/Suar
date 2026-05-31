export type DomainEventOutboxRetentionTransaction = object

export interface DomainEventOutboxRetentionDueCounts {
  processedRows: number
  replayHistoryRows: number
}

export abstract class DomainEventOutboxRetentionRepository {
  abstract countDue(input: {
    processedBefore: Date
    replayHistoryBefore: Date
    cap: number
  }): Promise<DomainEventOutboxRetentionDueCounts>

  abstract purgeProcessed(
    processedBefore: Date,
    limit: number,
    trx: DomainEventOutboxRetentionTransaction
  ): Promise<number>

  abstract purgeReplayHistory(
    replayHistoryBefore: Date,
    limit: number,
    trx: DomainEventOutboxRetentionTransaction
  ): Promise<number>
}
