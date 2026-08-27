import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { BaseQuery } from '#modules/users/actions/base_query'
import type {
  PersistedUserProfileSnapshot,
  UserProfileRepository,
} from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'

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
  snapshot: Omit<PersistedUserProfileSnapshot, 'id' | 'user_id' | 'shareable_token'> & {
    shareable_token: null
  }
}

function withoutPublicSnapshotIdentifiers(
  snapshot: PersistedUserProfileSnapshot
): PublicProfileSnapshotResult['snapshot'] {
  const {
    id: _snapshotId,
    user_id: _ownerId,
    shareable_token: _shareableToken,
    summary,
    work_highlights,
    ...publicSnapshot
  } = snapshot

  const publicSummary = summary
    ? Object.fromEntries(Object.entries(summary).filter(([key]) => key !== 'user_id'))
    : summary
  const publicHighlights = work_highlights?.map((highlight) => {
    if (!highlight || typeof highlight !== 'object' || Array.isArray(highlight)) return highlight
    return Object.fromEntries(
      Object.entries(highlight).filter(
        ([key]) => key !== 'task_id' && key !== 'task_assignment_id'
      )
    )
  })

  return {
    ...publicSnapshot,
    summary: publicSummary ?? null,
    work_highlights: publicHighlights ?? null,
    shareable_token: null,
  }
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
      snapshot: withoutPublicSnapshotIdentifiers(snapshot),
    }
  }
}
