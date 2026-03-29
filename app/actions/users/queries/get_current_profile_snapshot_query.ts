import { BaseQuery } from '#actions/shared/base_query'
import UserProfileSnapshotRepository from '#infra/users/repositories/user_profile_snapshot_repository'
import type { DatabaseId } from '#types/database'

export class GetCurrentProfileSnapshotDTO {
  declare userId: DatabaseId

  constructor(userId: DatabaseId) {
    this.userId = userId
  }
}

export interface CurrentProfileSnapshotResult {
  snapshot: import('#models/user_profile_snapshot').default | null
}

export default class GetCurrentProfileSnapshotQuery extends BaseQuery<
  GetCurrentProfileSnapshotDTO,
  CurrentProfileSnapshotResult
> {
  async handle(dto: GetCurrentProfileSnapshotDTO): Promise<CurrentProfileSnapshotResult> {
    const cacheKey = this.generateCacheKey('profile:snapshot:current', { userId: dto.userId })

    return await this.executeWithCache(cacheKey, 120, async () => {
      const snapshot = await UserProfileSnapshotRepository.findCurrentByUser(dto.userId)

      return { snapshot }
    })
  }
}
