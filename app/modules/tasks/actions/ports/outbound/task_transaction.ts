/**
 * Opaque transaction handle owned by the Tasks application boundary.
 *
 * Infrastructure adapters may unwrap this value to their concrete transaction
 * client, but actions and public ports must not depend on Lucid.
 */
export type TaskTransaction = object

export interface TaskTransactionRunner {
  run<T>(work: (transaction: TaskTransaction) => Promise<T>): Promise<T>
}
