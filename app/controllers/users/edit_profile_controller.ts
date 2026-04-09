import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery from '#actions/users/queries/get_user_profile_query'
import GetUserSkillsQuery from '#actions/users/queries/get_user_skills_query'
import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { skillCategoryOptions, proficiencyLevelOptions } from '#constants/user_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import { ExecutionContext } from '#types/execution_context'
import {
  buildGetUserProfileDTO,
  buildGetUserSkillsDTO,
} from './mapper/request/user_request_mapper.js'
import { mapProfileEditPageProps } from './mapper/response/user_response_mapper.js'

/**
 * GET /profile/edit → Display profile edit form
 */
export default class EditProfileController {
  async handle(ctx: HttpContext) {
    const currentUser = ctx.auth.user
    if (!currentUser) {
      throw new UnauthorizedException()
    }
    const userId = currentUser.id
    const execCtx = ExecutionContext.fromHttp(ctx)

    const [{ user, completeness }, availableSkills, userSkills] = await Promise.all([
      new GetUserProfileQuery(execCtx).handle(buildGetUserProfileDTO(userId)),
      GetActiveSkillsQuery.execute(),
      new GetUserSkillsQuery(execCtx).handle(buildGetUserSkillsDTO(userId)),
    ])

    return ctx.inertia.render(
      'profile/edit',
      mapProfileEditPageProps({
        user,
        completeness,
        availableSkills,
        categories: skillCategoryOptions,
        proficiencyLevels: proficiencyLevelOptions,
        userSkills,
      })
    )
  }
}
