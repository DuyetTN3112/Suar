import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from './get_user_skills_query.js'

import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'
import type { UserActionContext } from '#modules/users/actions/user_action_context'
import { proficiencyLevelOptions, skillCategoryOptions } from '#modules/users/public_contracts/user_constants'

export interface GetProfileEditPageInput {
  userId: string
}

export interface GetProfileEditPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  completeness: number
  availableSkills: Awaited<ReturnType<typeof skillPublicApi.listActive>>
  categories: typeof skillCategoryOptions
  proficiencyLevels: typeof proficiencyLevelOptions
  userSkills: Awaited<ReturnType<GetUserSkillsQuery['handle']>>
}

export default class GetProfileEditPageQuery {
  constructor(protected execCtx: UserActionContext) {}

  async execute(input: GetProfileEditPageInput): Promise<GetProfileEditPageResult> {
    const [profile, availableSkills, userSkills] = await Promise.all([
      new GetUserProfileQuery(this.execCtx).handle(new GetUserProfileDTO(input.userId)),
      skillPublicApi.listActive(),
      new GetUserSkillsQuery(this.execCtx).handle(new GetUserSkillsDTO(input.userId)),
    ])

    return {
      user: profile.user,
      completeness: profile.completeness,
      availableSkills,
      categories: skillCategoryOptions,
      proficiencyLevels: proficiencyLevelOptions,
      userSkills,
    }
  }
}
