import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { buildUpdateUserSkillDTO } from '../mappers/request/profile/user_request_mapper.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { UserProfileActionFactory } from '#modules/users/actions/ports/inbound/user_profile_action_factory'

/**
 * PUT /profile/skills/:id → Update skill proficiency level
 */
@inject()
export default class UpdateProfileSkillController {
  constructor(private readonly profileActions: UserProfileActionFactory) {}

  async handle(ctx: HttpContext) {
    const { request, response, session, params } = ctx

    const dto = buildUpdateUserSkillDTO(request, params['skillId'] as string)
    const command = this.profileActions.makeUpdateSkill(actionContextFromHttp(ctx))
    await command.executeAndWrap(dto).then((outcome) => outcome.getValue())

    session.flash('success', 'Skill updated successfully')

    response.redirect().back()
  }
}
