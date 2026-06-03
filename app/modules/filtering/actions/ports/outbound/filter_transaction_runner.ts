export type FilterTransaction = object

export interface FilterTransactionRunner {
  run<T>(work: (transaction: FilterTransaction) => Promise<T>): Promise<T>
}
