import type { HttpContext } from '@adonisjs/core/http'
import { ExecutionContext } from '#types/execution_context'
import RemoveUserSkillCommand from '#actions/users/commands/remove_user_skill_command'
import { RemoveUserSkillDTO } from '#actions/users/dtos/request/user_skill_dtos'

/**
 * DELETE /profile/skills/:id → Remove a skill from user's profile
 */
export default class RemoveProfileSkillController {
  async handle(ctx: HttpContext) {
    const { response, session, params } = ctx

    const dto = new RemoveUserSkillDTO(params.id as string)
    const command = new RemoveUserSkillCommand(ExecutionContext.fromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill removed successfully')

    response.redirect().back()
  }
}
