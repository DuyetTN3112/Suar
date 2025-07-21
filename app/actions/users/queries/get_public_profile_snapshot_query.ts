import { BaseQuery } from '#actions/shared/base_query'
import UserProfileSnapshotRepository from '#infra/users/repositories/user_profile_snapshot_repository'
import NotFoundException from '#exceptions/not_found_exception'

export class GetPublicProfileSnapshotDTO {
  declare slug: string
  declare token: string | null

  constructor(slug: string, token?: string | null) {
    this.slug = slug.trim()
    const normalizedToken = token?.trim() ?? null
    this.token = normalizedToken && normalizedToken.length > 0 ? normalizedToken : null
  }
}

export interface PublicProfileSnapshotResult {
  snapshot: import('#models/user_profile_snapshot').default
}

export default class GetPublicProfileSnapshotQuery extends BaseQuery<
  GetPublicProfileSnapshotDTO,
  PublicProfileSnapshotResult
> {
  async handle(dto: GetPublicProfileSnapshotDTO): Promise<PublicProfileSnapshotResult> {
    const cacheKey = this.generateCacheKey('profile:snapshot:public', {
      slug: dto.slug,
      token: dto.token ?? 'public',
    })

    return await this.executeWithCache(cacheKey, 180, async () => {
      const snapshot = await UserProfileSnapshotRepository.findPublicBySlugOrToken(
        dto.slug,
        dto.token
      )

      if (!snapshot) {
        throw new NotFoundException('Public profile snapshot not found')
      }

      return { snapshot }
    })
  }
}
