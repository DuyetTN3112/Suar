import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserSkillDTO } from './mappers/request/user_request_mapper.js'

import UpdateUserSkillCommand from '#actions/users/commands/update_user_skill_command'
import { ExecutionContext } from '#types/execution_context'

/**
 * PUT /profile/skills/:id → Update skill proficiency level
 */
export default class UpdateProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    const dto = buildUpdateUserSkillDTO(request, params.id as string)
    const command = new UpdateUserSkillCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill updated successfully')

    response.redirect().back()
  }
}
