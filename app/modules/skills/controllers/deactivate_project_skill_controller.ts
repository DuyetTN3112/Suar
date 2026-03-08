import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { SkillProjectAccessGuard } from './project_access_guard.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import DeactivateProjectSkillCommand from '#modules/skills/actions/commands/deactivate_project_skill_command'

@inject()
export default class DeactivateProjectSkillController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly deactivateProjectSkill: DeactivateProjectSkillCommand
  ) {}

  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params['projectId'] as string
    const projectSkillId = params['projectSkillId'] as string

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

    await this.deactivateProjectSkill.execute({
      projectSkillId,
      actorId: userId,
      auditContext: actionContextFromHttp(ctx),
    })

    response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
