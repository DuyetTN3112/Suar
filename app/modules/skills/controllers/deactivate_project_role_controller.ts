import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { SkillProjectAccessGuard } from './project_access_guard.js'

import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import DeactivateProjectRoleCommand from '#modules/skills/actions/commands/deactivate_project_role_command'
import RemoveProjectRoleSkillCommand from '#modules/skills/actions/commands/remove_project_role_skill_command'

@inject()
export default class DeactivateProjectRoleController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly deactivateProjectRole: DeactivateProjectRoleCommand,
    private readonly removeProjectRoleSkill: RemoveProjectRoleSkillCommand
  ) {}

  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params['projectId'] as string
    const roleId = params['roleId'] as string
    const roleSkillId = params['roleSkillId'] as string | undefined

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

    if (roleSkillId) {
      await this.removeProjectRoleSkill.execute(roleSkillId, {
        actorId: userId,
        context: actionContextFromHttp(ctx),
      })

      response.status(HttpStatus.NO_CONTENT).send(null)
      return
    }

    await this.deactivateProjectRole.execute(roleId, {
      actorId: userId,
      context: actionContextFromHttp(ctx),
    })

    response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
