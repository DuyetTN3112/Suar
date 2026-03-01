import type { HttpContext } from '@adonisjs/core/http'

import { buildAddUserSkillDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import AddUserSkillCommand from '#modules/users/actions/commands/add_user_skill_command'

/**
 * POST /profile/skills → Add a skill to user's profile
 */
export default class AddProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = buildAddUserSkillDTO(request)
    const command = new AddUserSkillCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill added successfully')

    response.redirect().back()
  }
}
