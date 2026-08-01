import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
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
  constructor(context: UserActionContext, private readonly profiles: UserProfileRepository) {
    super(context)
  }

  async handle(dto: GetCurrentProfileSnapshotDTO): Promise<CurrentProfileSnapshotResult> {
    // Raw snapshot rows contain the share token. Keep them out of Redis until
    // this query returns a secret-free owner-only projection.
    const snapshot = await this.profiles.findCurrentSnapshot(dto.userId)
    return { snapshot }
  }
}
