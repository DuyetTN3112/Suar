/**
 * Opaque transaction handle owned by the Accomplishments application boundary.
 *
 * The command can pass this handle to the source reader and writer so a
 * projection observes and persists one consistent source boundary. Only an
 * infrastructure adapter is allowed to unwrap it to a database transaction.
 */
export type AccomplishmentTransaction = object

export interface AccomplishmentTransactionRunner {
  run<T>(work: (transaction: AccomplishmentTransaction) => Promise<T>): Promise<T>
}
