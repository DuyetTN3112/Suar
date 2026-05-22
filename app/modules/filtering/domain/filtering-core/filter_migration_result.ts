export type FilterMigrationOutcome = 'compatible' | 'migrated' | 'requires_repair' | 'blocked'

export interface FilterMigrationDiagnostic {
  readonly code: string
  readonly path: string | null
  readonly message: string
}

export interface FilterMigrationReceipt {
  readonly migrationId: string
  readonly inputChecksum: string
  readonly outputChecksum: string
  readonly idempotencyKey: string
}

export interface AtomicFilterMigrationPayload {
  readonly contextKey: string
  readonly contextOwner: string
  readonly schemaVersion: number
  readonly payloadJson: string
  readonly checksum: string
}

interface FilterMigrationResultBase {
  readonly contextKey: string
  readonly contextOwner: string
  readonly fromVersion: number
  readonly requestedToVersion: number
  readonly effectiveVersion: number
  readonly readerVersion: number | null
  readonly inputChecksum: string
  readonly migrationReceipts: readonly FilterMigrationReceipt[]
  readonly diagnostics: readonly FilterMigrationDiagnostic[]
}

export interface SuccessfulFilterMigrationResult extends FilterMigrationResultBase {
  readonly outcome: 'compatible' | 'migrated'
  readonly alertDisposition: 'unchanged'
  readonly atomicPayload: AtomicFilterMigrationPayload
  readonly preservedPayloadJson: null
}

export interface FailedFilterMigrationResult extends FilterMigrationResultBase {
  readonly outcome: 'requires_repair' | 'blocked'
  readonly alertDisposition: 'pause_requires_repair' | 'pause_blocked'
  readonly atomicPayload: null
  readonly preservedPayloadJson: string
}

export type FilterMigrationResult = SuccessfulFilterMigrationResult | FailedFilterMigrationResult
