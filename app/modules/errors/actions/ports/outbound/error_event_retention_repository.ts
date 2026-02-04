export type ErrorEventRetentionTransaction = object

export abstract class ErrorEventRetentionRepository {
  abstract countDue(
    before: Date,
    cap: number,
    trx?: ErrorEventRetentionTransaction
  ): Promise<number>

  abstract purgeDue(
    before: Date,
    limit: number,
    trx?: ErrorEventRetentionTransaction
  ): Promise<number>
}
