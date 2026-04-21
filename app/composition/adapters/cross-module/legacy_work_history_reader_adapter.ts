import UserWorkHistory from '#modules/users/infra/models/profile/user_work_history'
import type {
  LegacyWorkHistoryReader,
  LegacyWorkHistoryStorageRow,
} from '#modules/users/public_contracts/legacy_work_history_reader'

export class LegacyWorkHistoryReaderAdapter implements LegacyWorkHistoryReader {
  async list(input: {
    readonly column: 'organization_id' | 'user_id'
    readonly value: string
    readonly cursor: string | null
    readonly limit: number
  }): Promise<readonly LegacyWorkHistoryStorageRow[]> {
    const query = UserWorkHistory.query()
      .select(['id', 'user_id', 'task_id', 'task_assignment_id', 'evidence_links'])
      .where(input.column, input.value)
      .orderBy('id', 'asc')
      .limit(input.limit)
    if (input.cursor !== null) void query.where('id', '>=', input.cursor)
    return await query
  }
}
