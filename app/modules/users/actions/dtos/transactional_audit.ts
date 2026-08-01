export type TransactionalAuditWrite = () => Promise<void>

export interface TransactionalAuditOptions {
  readonly deferAuditWrite?: (write: TransactionalAuditWrite) => void
}
