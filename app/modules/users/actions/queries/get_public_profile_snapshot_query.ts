import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import type { UserProfileSnapshotRecord } from '#modules/users/types/user_records'

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
  constructor(context: UserActionContext, private readonly profiles: UserProfileRepository) {
    super(context)
  }

  async handle(dto: GetPublicProfileSnapshotDTO): Promise<PublicProfileSnapshotResult> {
    // Authorization is deliberately authoritative on every request. A shared
    // cache hit must never bypass link revocation/token rotation, and
    // attacker-controlled tokens must not create unbounded cache variants.
    const snapshot = await this.profiles.findPublicSnapshot(dto.slug, dto.token)

    if (!snapshot) {
      throw new NotFoundException('Public profile snapshot not found')
    }

    return {
      snapshot: {
        ...snapshot,
        shareable_token: null,
      },
    }
  }
}
