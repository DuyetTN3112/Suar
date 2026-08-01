export type ProjectTransaction = object

export interface ProjectTransactionRunner {
  run<T>(work: (transaction: ProjectTransaction) => Promise<T>): Promise<T>
}
