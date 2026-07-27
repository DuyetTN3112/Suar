import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'

@inject()
export default class DeactivateProjectSkillController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    await this.actions
      .makeDeactivateSkill(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId: String(ctx.params['projectId']),
        projectSkillId: String(ctx.params['projectSkillId']),
        auditContext: actionContextFromHttp(ctx),
      })
      .then((outcome) => outcome.getValue())
    ctx.response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
