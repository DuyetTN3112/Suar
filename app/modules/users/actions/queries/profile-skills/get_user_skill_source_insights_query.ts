import { BaseQuery } from '#modules/users/actions/base_query'
import type {
  UserSkillSourceInsights,
  UserTalentRepository,
} from '#modules/users/actions/ports/outbound/user_talent_repository'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'

export interface GetUserSkillSourceInsightsDTO {
  userIds: string[]
}

/**
 * Users-owned read use case for cross-module member insight projections.
 * It exposes IDs only and does not leak the Users persistence model.
 */
export default class GetUserSkillSourceInsightsQuery extends BaseQuery<
  GetUserSkillSourceInsightsDTO,
  UserSkillSourceInsights
> {
  constructor(private readonly talents: UserTalentRepository) {
    super(makeSystemUserActionContext('system'))
  }

  override handle(input: GetUserSkillSourceInsightsDTO): Promise<UserSkillSourceInsights> {
    return this.talents.getSkillSourceInsights([...new Set(input.userIds)])
  }

  /** Backward-compatible adapter for existing composition callers. */
  execute(input: GetUserSkillSourceInsightsDTO): Promise<UserSkillSourceInsights> {
    return this.handle(input)
  }
}
