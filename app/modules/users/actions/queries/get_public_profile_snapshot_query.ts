import NotFoundException from '#exceptions/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import * as profileSnapshotQueries from '#modules/users/infra/repositories/read/user_profile_snapshot_queries'
import type { UserProfileSnapshotRecord } from '#types/user_records'

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
  snapshot: UserProfileSnapshotRecord
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
      const snapshot = await profileSnapshotQueries.findPublicBySlugOrToken(dto.slug, dto.token)

      if (!snapshot) {
        throw new NotFoundException('Public profile snapshot not found')
      }

      return { snapshot }
    })
  }
}
