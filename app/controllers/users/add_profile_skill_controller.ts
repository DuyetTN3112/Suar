import type { HttpContext } from '@adonisjs/core/http'

import { buildAddUserSkillDTO } from './mappers/request/user_request_mapper.js'

import AddUserSkillCommand from '#actions/users/commands/add_user_skill_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * POST /profile/skills → Add a skill to user's profile
 */
export default class AddProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = buildAddUserSkillDTO(request)
    const command = new AddUserSkillCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill added successfully')

    response.redirect().back()
  }
}
