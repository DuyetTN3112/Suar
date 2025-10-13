import { BaseQuery } from '#actions/users/base_query'
import * as profileSnapshotQueries from '#infra/users/repositories/read/user_profile_snapshot_queries'
import type { DatabaseId } from '#types/database'
import type { UserProfileSnapshotRecord } from '#types/user_records'

export class GetCurrentProfileSnapshotDTO {
  declare userId: DatabaseId

  constructor(userId: DatabaseId) {
    this.userId = userId
  }
}

export interface CurrentProfileSnapshotResult {
  snapshot: UserProfileSnapshotRecord | null
}

export default class GetCurrentProfileSnapshotQuery extends BaseQuery<
  GetCurrentProfileSnapshotDTO,
  CurrentProfileSnapshotResult
> {
  async handle(dto: GetCurrentProfileSnapshotDTO): Promise<CurrentProfileSnapshotResult> {
    const cacheKey = this.generateCacheKey('profile:snapshot:current', { userId: dto.userId })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const snapshot = await profileSnapshotQueries.findCurrentByUser(dto.userId)

      return { snapshot }
    })
  }
}
