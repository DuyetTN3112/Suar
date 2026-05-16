import type {
  LegacyAccomplishmentBackfillReader,
  LegacyAccomplishmentSource,
} from '#modules/accomplishments/actions/commands/legacy-backfill/run_legacy_accomplishment_backfill_command'
import type {
  LegacyWorkHistoryReader,
  LegacyWorkHistoryStorageRow,
} from '#modules/users/public_contracts/legacy_work_history_reader'

/**
 * Reads the legacy compatibility table without promoting it to an authoritative
 * accomplishment source. The old row has no immutable assignment, governed
 * review, or verified-claim provenance, so those facts intentionally remain false.
 */
export function mapLegacyWorkHistoryRow(row: LegacyWorkHistoryStorageRow): LegacyAccomplishmentSource {
  const sourceCorrupt =
    row.id.trim().length === 0 ||
    row.user_id === null ||
    row.task_id === null ||
    row.task_assignment_id === null ||
    !Array.isArray(row.evidence_links)

  return {
    sourceId: row.id,
    userId: row.user_id,
    taskAssignmentId: row.task_assignment_id,
    taskId: row.task_id,
    hasImmutableAssignmentSnapshot: false,
    hasCompletionReport: false,
    hasGovernedReviewConfirmation: false,
    hasVerifiedClaim: false,
    hasSufficientEvidence: false,
    userConfirmedRetrospective: false,
    sourceCorrupt,
  }
}

function scopeFilter(scopeKey: string): { column: 'organization_id' | 'user_id'; value: string } {
  const [kind, ...parts] = scopeKey.split(':')
  const value = parts.join(':')
  if ((kind !== 'organization' && kind !== 'user') || value.trim().length === 0) {
    throw new TypeError('Legacy backfill scope must be organization:<id> or user:<id>')
  }
  return { column: kind === 'organization' ? 'organization_id' : 'user_id', value }
}

export default class LucidLegacyAccomplishmentBackfillReader
  implements LegacyAccomplishmentBackfillReader
{
  constructor(private readonly storageReader: LegacyWorkHistoryReader) {}

  async list(input: {
    readonly scopeKey: string
    readonly cursor: string | null
    readonly limit: number
  }): Promise<readonly LegacyAccomplishmentSource[]> {
    if (!Number.isSafeInteger(input.limit) || input.limit < 1) {
      throw new TypeError('Legacy backfill limit must be a positive safe integer')
    }

    const scope = scopeFilter(input.scopeKey)
    const rows = await this.storageReader.list({
      column: scope.column,
      value: scope.value,
      cursor: input.cursor,
      limit: input.limit,
    })
    return rows.map(mapLegacyWorkHistoryRow)
  }
}
