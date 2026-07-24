import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'

@inject()
export default class DeactivateProjectRoleController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    await this.actions
      .makeDeleteRoleTarget(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId: String(ctx.params['projectId']),
        roleId: String(ctx.params['roleId']),
        ...(ctx.params['roleSkillId'] === undefined
          ? {}
          : { roleSkillId: String(ctx.params['roleSkillId']) }),
        auditContext: actionContextFromHttp(ctx),
      })
      .then((outcome) => outcome.getValue())
    ctx.response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
