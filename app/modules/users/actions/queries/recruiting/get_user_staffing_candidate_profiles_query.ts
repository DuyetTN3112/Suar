import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import { makeSystemUserActionContext } from '#modules/users/actions/user_action_context'
import type { TalentExplainabilitySummary } from '#modules/users/domain/profile/talent_explainability_projection'

export interface UserStaffingCandidateSkillProfile {
  skillId: string
  proficiencyCode: string
}

export interface UserStaffingCandidateProfile {
  userId: string
  username: string
  email: string
  skills: UserStaffingCandidateSkillProfile[]
  explainability: TalentExplainabilitySummary | null
}

/**
 * Users-owned read use case for staffing candidate identity and skill facts.
 */
interface GetUserStaffingCandidateProfilesInput {
  readonly skillIds: string[]
}

export default class GetUserStaffingCandidateProfilesQuery extends BaseQuery<
  GetUserStaffingCandidateProfilesInput,
  UserStaffingCandidateProfile[]
> {
  constructor(private readonly talents: UserTalentRepository) {
    super(makeSystemUserActionContext('system'))
  }

  override async handle({ skillIds }: GetUserStaffingCandidateProfilesInput): Promise<UserStaffingCandidateProfile[]> {
    const rows = await this.talents.findStaffingCandidateFacts(skillIds)
    const profilesByUserId = new Map<
      string,
      Omit<UserStaffingCandidateProfile, 'explainability'>
    >()

    for (const row of rows) {
      const profile = profilesByUserId.get(row.user_id) ?? {
        userId: row.user_id,
        username: row.username,
        email: row.email,
        skills: [],
      }
      profile.skills.push({
        skillId: row.skill_id,
        proficiencyCode: row.verified_public_proficiency_code,
      })
      profilesByUserId.set(row.user_id, profile)
    }

    const explainabilityByUserId = await this.talents.getExplainabilitySummaries([
      ...profilesByUserId.keys(),
    ])

    return [...profilesByUserId.values()].map((profile) => ({
      ...profile,
      explainability: explainabilityByUserId.get(profile.userId) ?? null,
    }))
  }

  /** Backward-compatible adapter for existing composition callers. */
  async execute(skillIds: string[]): Promise<UserStaffingCandidateProfile[]> {
    return this.handle({ skillIds })
  }
}
