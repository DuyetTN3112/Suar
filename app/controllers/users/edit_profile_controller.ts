import type { HttpContext } from '@adonisjs/core/http'
import GetUserProfileQuery, {
  GetUserProfileDTO,
} from '#actions/users/queries/get_user_profile_query'
import GetUserSkillsQuery, { GetUserSkillsDTO } from '#actions/users/queries/get_user_skills_query'
import GetActiveSkillsQuery from '#actions/shared/queries/get_active_skills_query'
import { skillCategoryOptions, proficiencyLevelOptions } from '#constants/user_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'

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

    const query = new GetUserProfileQuery(ctx)
    const user = await query.handle(new GetUserProfileDTO(userId))

    const skills = await GetActiveSkillsQuery.execute()
    const categories = skillCategoryOptions
    const proficiencyLevels = proficiencyLevelOptions

    const skillsQuery = new GetUserSkillsQuery(ctx)
    const userSkills = await skillsQuery.handle(new GetUserSkillsDTO(userId))

    const completeness = this.calculateProfileCompleteness(user.serialize())

    return ctx.inertia.render('profile/edit', {
      user: user.serialize(),
      completeness,
      availableSkills: skills,
      categories,
      proficiencyLevels,
      userSkills,
    })
  }

  private calculateProfileCompleteness(user: {
    username?: string | null
    email?: string | null
    avatar_url?: string | null
    bio?: string | null
    phone?: string | null
    skills?: unknown[]
  }): number {
    const fields = [
      user.username,
      user.email,
      user.avatar_url,
      user.bio,
      user.phone,
      user.skills && user.skills.length > 0,
    ]
    const filledFields = fields.filter(Boolean).length
    return Math.round((filledFields / fields.length) * 100)
  }
}
