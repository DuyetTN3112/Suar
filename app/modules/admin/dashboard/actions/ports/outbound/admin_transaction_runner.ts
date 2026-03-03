export type AdminTransaction = object

export abstract class AdminTransactionRunner {
  abstract run<T>(
    callback: (transaction: AdminTransaction) => Promise<T>
  ): Promise<T>
}
