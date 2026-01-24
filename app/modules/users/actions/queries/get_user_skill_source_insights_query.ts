import type {
  UserSkillSourceInsights,
  UserTalentRepository,
} from '#modules/users/actions/ports/outbound/user_talent_repository'

export interface GetUserSkillSourceInsightsDTO {
  userIds: string[]
}

/**
 * Users-owned read use case for cross-module member insight projections.
 * It exposes IDs only and does not leak the Users persistence model.
 */
export default class GetUserSkillSourceInsightsQuery {
  constructor(private readonly talents: UserTalentRepository) {}

  execute(input: GetUserSkillSourceInsightsDTO): Promise<UserSkillSourceInsights> {
    return this.talents.getSkillSourceInsights([...new Set(input.userIds)])
  }
}
