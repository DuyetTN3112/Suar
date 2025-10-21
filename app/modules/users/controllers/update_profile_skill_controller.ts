import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserSkillDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import UpdateUserSkillCommand from '#modules/users/actions/commands/update_user_skill_command'

/**
 * PUT /profile/skills/:id → Update skill proficiency level
 */
export default class UpdateProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    const dto = buildUpdateUserSkillDTO(request, params['skillId'] as string)
    const command = new UpdateUserSkillCommand(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill updated successfully')

    response.redirect().back()
  }
}
