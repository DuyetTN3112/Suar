export interface LegacyWorkHistoryStorageRow {
  readonly id: string
  readonly user_id: string | null
  readonly task_id: string | null
  readonly task_assignment_id: string | null
  readonly evidence_links: unknown
}

export interface LegacyWorkHistoryReader {
  list(input: {
    readonly column: 'organization_id' | 'user_id'
    readonly value: string
    readonly cursor: string | null
    readonly limit: number
  }): Promise<readonly LegacyWorkHistoryStorageRow[]>
}
