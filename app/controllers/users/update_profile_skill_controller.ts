import type { HttpContext } from '@adonisjs/core/http'
import UpdateUserSkillCommand from '#actions/users/commands/update_user_skill_command'
import { UpdateUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'

/**
 * PUT /profile/skills/:id → Update skill proficiency level
 */
export default class UpdateProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    try {
      const dto = new UpdateUserSkillDTO(params.id as string, request.input('level_code') as string)
      const command = new UpdateUserSkillCommand(ctx)
      await command.handle(dto)

      session.flash('success', 'Skill updated successfully')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update skill'
      session.flash('error', message)
    }

    response.redirect().back()
  }
}
