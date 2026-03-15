import type { HttpContext } from '@adonisjs/core/http'
import RemoveUserSkillCommand from '#actions/users/commands/remove_user_skill_command'
import { RemoveUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'

/**
 * DELETE /profile/skills/:id → Remove a skill from user's profile
 */
export default class RemoveProfileSkillController {
  async handle(ctx: HttpContext) {
    const { response, session, params } = ctx

    try {
      const dto = new RemoveUserSkillDTO(params.id as string)
      const command = new RemoveUserSkillCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Skill removed successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove skill'
      session.flash('error', message)
    }

    response.redirect().back()
  }
}
