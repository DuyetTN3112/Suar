export type TransactionalAuditWrite = () => Promise<void>

export interface TransactionalAuditDeferralOptions {
  deferAuditWrite?: (write: TransactionalAuditWrite) => void
}
