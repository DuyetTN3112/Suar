import type { HttpContext } from '@adonisjs/core/http'
import AddUserSkillCommand from '#actions/users/commands/add_user_skill_command'
import { AddUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'

/**
 * POST /profile/skills → Add a skill to user's profile
 */
export default class AddProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = new AddUserSkillDTO(
      request.input('skill_id') as string,
      request.input('level_code') as string
    )
    const command = new AddUserSkillCommand(ctx)
    await command.handle(dto)

    session.flash('success', 'Skill added successfully')

    response.redirect().back()
  }
}
