import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'

export class GetProfileSnapshotHistoryDTO {
  declare userId: string
  declare limit: number

  constructor(userId: string, limit?: number) {
    this.userId = userId

    const normalizedLimit = typeof limit === 'number' ? limit : 20
    if (!Number.isFinite(normalizedLimit) || normalizedLimit <= 0) {
      this.limit = 20
      return
    }

    this.limit = Math.min(Math.floor(normalizedLimit), 100)
  }
}

export interface ProfileSnapshotHistoryResult {
  snapshots: UserProfileSnapshotRecord[]
}

export default class GetProfileSnapshotHistoryQuery extends BaseQuery<
  GetProfileSnapshotHistoryDTO,
  ProfileSnapshotHistoryResult
> {
  constructor(context: UserActionContext, private readonly profiles: UserProfileRepository) {
    super(context)
  }

  async handle(dto: GetProfileSnapshotHistoryDTO): Promise<ProfileSnapshotHistoryResult> {
    // Raw history rows contain share tokens. Do not persist them in Redis.
    const snapshots = await this.profiles.listSnapshots(dto.userId, dto.limit)
    return { snapshots }
  }
}
