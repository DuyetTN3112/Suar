import type { TalentExplainabilitySummary } from '#modules/users/domain/talent_explainability_projection'
import type { SearchTalentsDTO } from '#modules/users/public_contracts/talent_search'

export interface TalentUserRecord {
  id: string
  username: string
  status: string
  trust_data: unknown
  avatar_url: string | null
  bio: string | null
  profile_settings: unknown
  is_external_contributor: boolean
  external_contributor_completed_tasks_count: number
}

export interface TalentSkillMatchFact {
  user_id: string
  skill_id: string
  verified_public_proficiency_code: string
  source: string
}

export interface TalentWorkHistoryMatchFact {
  user_id: string
  business_domain: string
  problem_category: string
  task_type: string
  was_on_time: boolean
}

export interface StaffingCandidateIdentitySkillFact {
  user_id: string
  username: string
  email: string
  skill_id: string
  verified_public_proficiency_code: string
}

export interface UserSkillSourceInsights {
  reviewedUserIds: string[]
  importedOnlyUserIds: string[]
}

export interface UserTalentRepository {
  findDiscoverableTalents(
    input: SearchTalentsDTO,
    categorySkillIds: string[] | null,
    userIds?: string[]
  ): Promise<TalentUserRecord[]>
  listSkillMatchFacts(userIds: string[]): Promise<TalentSkillMatchFact[]>
  listWorkHistoryMatchFacts(userIds: string[]): Promise<TalentWorkHistoryMatchFact[]>
  getExplainabilitySummaries(
    userIds: string[]
  ): Promise<Map<string, TalentExplainabilitySummary>>
  findStaffingCandidateFacts(
    skillIds: string[]
  ): Promise<StaffingCandidateIdentitySkillFact[]>
  getSkillSourceInsights(userIds: string[]): Promise<UserSkillSourceInsights>
}
