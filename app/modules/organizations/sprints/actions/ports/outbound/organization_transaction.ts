export type OrganizationTransaction = object

export abstract class OrganizationTransactionRunner {
  abstract run<T>(work: (transaction: OrganizationTransaction) => Promise<T>): Promise<T>
}
