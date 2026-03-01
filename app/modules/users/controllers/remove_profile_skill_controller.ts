import type { HttpContext } from '@adonisjs/core/http'

import { buildRemoveUserSkillDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import RemoveUserSkillCommand from '#modules/users/actions/commands/remove_user_skill_command'

/**
 * DELETE /profile/skills/:id → Remove a skill from user's profile
 */
export default class RemoveProfileSkillController {
  async handle(ctx: HttpContext) {
    const { response, session, params } = ctx

    const dto = buildRemoveUserSkillDTO(params.id as string)
    const command = new RemoveUserSkillCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill removed successfully')

    response.redirect().back()
  }
}
