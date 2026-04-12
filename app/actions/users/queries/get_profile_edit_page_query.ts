import GetUserProfileQuery, { GetUserProfileDTO } from './get_user_profile_query.js'
import GetUserSkillsQuery, { GetUserSkillsDTO } from './get_user_skills_query.js'

import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { proficiencyLevelOptions, skillCategoryOptions } from '#constants/user_constants'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

export interface GetProfileEditPageInput {
  userId: DatabaseId
}

export interface GetProfileEditPageResult {
  user: Awaited<ReturnType<GetUserProfileQuery['handle']>>['user']
  completeness: number
  availableSkills: Awaited<ReturnType<(typeof GetActiveSkillsQuery)['execute']>>
  categories: typeof skillCategoryOptions
  proficiencyLevels: typeof proficiencyLevelOptions
  userSkills: Awaited<ReturnType<GetUserSkillsQuery['handle']>>
}

export default class GetProfileEditPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(input: GetProfileEditPageInput): Promise<GetProfileEditPageResult> {
    const [profile, availableSkills, userSkills] = await Promise.all([
      new GetUserProfileQuery(this.execCtx).handle(new GetUserProfileDTO(input.userId)),
      GetActiveSkillsQuery.execute(),
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
