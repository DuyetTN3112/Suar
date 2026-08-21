import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type { UserOrganizationMembershipReaderWriter } from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import { hydrateUserSkillProfileRecords } from '#modules/users/actions/queries/profile-skills/hydrate_user_skill_profile_records_query'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { calculateProfileCompleteness } from '#modules/users/domain/profile/profile_completeness_policy'
import type { UserProfileRecord } from '#modules/users/types/user_records'

/**
 * GetUserProfileDTO
 */
export class GetUserProfileDTO {
  declare user_id: string
  declare include_skills: boolean
  declare include_spider_chart: boolean

  constructor(userId: string, includeSkills = true, includeSpiderChart = true) {
    this.user_id = userId
    this.include_skills = includeSkills
    this.include_spider_chart = includeSpiderChart
  }
}

export interface UserProfileResult {
  user: UserProfileRecord
  completeness: number
}

/**
 * GetUserProfileQuery
 *
 * Fetches complete user profile including:
 * - Basic user info
 * - User details (avatar, bio, external_contributor info)
 * - Skills with proficiency levels
 * - Spider chart data for soft skills
 * - Profile completeness percentage
 *
 * This projection intentionally bypasses shared cache until it is split into
 * explicit owner, organization-manager, and public allowlisted DTOs. Caching
 * the raw profile record would persist PII under a viewer-agnostic key.
 */
export default class GetUserProfileQuery extends BaseQuery<GetUserProfileDTO, UserProfileResult> {
  constructor(
    execCtx: UserActionContext,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository
  ) {
    super(execCtx)
  }

  async handle(dto: GetUserProfileDTO): Promise<UserProfileResult> {
    const user = await this.users.findProfile(dto.user_id)
    const [currentOrganization, rawSkills] = await Promise.all([
      user.current_organization_id
        ? this.organizationMembership.findOrganizationSummary(
            user.current_organization_id
          )
        : null,
      dto.include_skills ? this.profiles.listUserSkills(dto.user_id) : [],
    ])
    const skills = await hydrateUserSkillProfileRecords(
      rawSkills,
      this.skillCatalog
    )
    const serializedUser: UserProfileRecord = {
      ...user,
      current_organization: currentOrganization,
      skills,
    }
    return { user: serializedUser, completeness: calculateProfileCompleteness(serializedUser) }
  }
}
