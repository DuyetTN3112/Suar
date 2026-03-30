import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildRemoveUserSkillDTO } from './mappers/request/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

/**
 * DELETE /profile/skills/:id → Remove a skill from user's profile
 */
@inject()
export default class RemoveProfileSkillController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { response, session, params } = ctx

    const dto = buildRemoveUserSkillDTO(params['skillId'] as string)
    const command = this.profileActions.makeRemoveSkill(actionContextFromHttp(ctx))
    await command.handle(dto)

    session.flash('success', 'Skill removed successfully')

    response.redirect().back()
  }
}
