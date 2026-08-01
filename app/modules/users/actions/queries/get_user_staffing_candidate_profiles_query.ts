import type { UserTalentRepository } from '#modules/users/actions/ports/outbound/user_talent_repository'
import type { TalentExplainabilitySummary } from '#modules/users/domain/talent_explainability_projection'

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
export default class GetUserStaffingCandidateProfilesQuery {
  constructor(private readonly talents: UserTalentRepository) {}

  async execute(skillIds: string[]): Promise<UserStaffingCandidateProfile[]> {
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
}
