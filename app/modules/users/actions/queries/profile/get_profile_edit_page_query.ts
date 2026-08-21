import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from '../profile-skills/get_user_skills_query.js'

import { CANONICAL_PROFICIENCY_LEVEL_OPTIONS } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'
import { BaseQuery } from '#modules/users/actions/base_query'
import type { UserSkillCatalog } from '#modules/users/actions/ports/outbound/profile-skills/user_skill_catalog'
import type { UserAccountRepository } from '#modules/users/actions/ports/outbound/user_account_repository'
import type {
  UserOrganizationMembershipReaderWriter,
  UserSkillReader,
} from '#modules/users/actions/ports/outbound/user_external_dependencies'
import type { UserProfileRepository } from '#modules/users/actions/ports/outbound/user_profile_repository'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { skillCategoryOptions } from '#modules/users/public_contracts/user_constants'

export interface GetProfileEditPageInput {
  userId: string
}

export interface GetProfileEditPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  completeness: number
  availableSkills: Awaited<ReturnType<UserSkillCatalog['listActiveSkills']>>
  categories: typeof skillCategoryOptions
  proficiencyLevels: typeof CANONICAL_PROFICIENCY_LEVEL_OPTIONS
  userSkills: Awaited<ReturnType<GetUserSkillsQuery['handle']>>
}

export default class GetProfileEditPageQuery extends BaseQuery<
  GetProfileEditPageInput,
  GetProfileEditPageResult
> {
  constructor(
    protected override execCtx: UserActionContext,
    private readonly organizationMembership: UserOrganizationMembershipReaderWriter,
    private readonly skillReader: UserSkillReader,
    private readonly skillCatalog: UserSkillCatalog,
    private readonly users: UserAccountRepository,
    private readonly profiles: UserProfileRepository
  ) {
    super(execCtx)
  }

  async handle(input: GetProfileEditPageInput): Promise<GetProfileEditPageResult> {
    return this.execute(input)
  }

  async execute(input: GetProfileEditPageInput): Promise<GetProfileEditPageResult> {
    const [profile, availableSkills, userSkills] = await Promise.all([
      new GetUserProfileQuery(
        this.execCtx,
        this.organizationMembership,
        this.skillCatalog,
        this.users,
        this.profiles
      ).handle(new GetUserProfileDTO(input.userId)),
      this.skillCatalog.listActiveSkills(),
      new GetUserSkillsQuery(this.execCtx, this.skillReader, this.profiles).handle(
        new GetUserSkillsDTO(input.userId)
      ),
    ])

    return {
      user: profile.user,
      completeness: profile.completeness,
      availableSkills,
      categories: skillCategoryOptions,
      proficiencyLevels: CANONICAL_PROFICIENCY_LEVEL_OPTIONS,
      userSkills,
    }
  }
}
