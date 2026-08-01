export type UserTransaction = object

export interface UserTransactionRunner {
  run<T>(callback: (transaction: UserTransaction) => Promise<T>): Promise<T>
}
