import { BaseQuery } from '#actions/users/base_query'
import * as profileSnapshotQueries from '#infra/users/repositories/read/user_profile_snapshot_queries'
import type { DatabaseId } from '#types/database'
import type { UserProfileSnapshotRecord } from '#types/user_records'

export class GetProfileSnapshotHistoryDTO {
  declare userId: DatabaseId
  declare limit: number

  constructor(userId: DatabaseId, limit?: number) {
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
  async handle(dto: GetProfileSnapshotHistoryDTO): Promise<ProfileSnapshotHistoryResult> {
    const cacheKey = this.generateCacheKey('profile:snapshot:history', {
      userId: dto.userId,
      limit: dto.limit,
    })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const snapshots = await profileSnapshotQueries.listByUser(dto.userId, dto.limit)

      return { snapshots }
    })
  }
}
