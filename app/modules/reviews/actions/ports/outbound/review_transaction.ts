/**
 * Opaque transaction handle owned by the Reviews application boundary.
 *
 * Commands and queries may pass the handle between outbound ports, while only
 * infrastructure adapters are allowed to unwrap it to a concrete database
 * transaction.
 */
export type ReviewTransaction = object

export interface ReviewTransactionRunner {
  run<T>(work: (transaction: ReviewTransaction) => Promise<T>): Promise<T>
}
