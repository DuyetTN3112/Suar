import { BaseQuery } from '#modules/users/actions/base_query'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'

export class GetCurrentProfileSnapshotDTO {
  declare userId: string

  constructor(userId: string) {
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
