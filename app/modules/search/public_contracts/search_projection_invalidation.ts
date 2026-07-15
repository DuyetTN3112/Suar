export type SearchProjectionInvalidationOperation = 'upsert' | 'delete'

export interface SearchProjectionInvalidation {
  readonly entityType: string
  readonly entityId: string
  readonly operation: SearchProjectionInvalidationOperation
  readonly sourceRevision?: string
  readonly changedFields: readonly string[]
  readonly transactionKey: string
}
