import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildAddUserSkillDTO } from '../mappers/request/profile/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

/**
 * POST /profile/skills → Add a skill to user's profile
 */
@inject()
export default class AddProfileSkillController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session } = ctx

    const dto = buildAddUserSkillDTO(request)
    const command = this.profileActions.makeAddSkill(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    session.flash('success', 'Skill added successfully')

    response.redirect().back()
  }
}
