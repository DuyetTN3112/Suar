import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import UpdateUserSkillCommand from '#actions/users/commands/update_user_skill_command'
import { UpdateUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'

/**
 * PUT /profile/skills/:id → Update skill proficiency level
 */
export default class UpdateProfileSkillController {
  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    const dto = new UpdateUserSkillDTO(params.id as string, request.input('level_code') as string)
    const command = new UpdateUserSkillCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill updated successfully')

    response.redirect().back()
  }
}
