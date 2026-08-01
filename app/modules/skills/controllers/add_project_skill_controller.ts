import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from './mappers/request/read_aliased_input.js'
import { camelizeResponseValue } from './mappers/response/camelize_response.js'
import { SkillProjectAccessGuard } from './project_access_guard.js'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import AddProjectSkillCommand from '#modules/skills/actions/commands/add_project_skill_command'

@inject()
export default class AddProjectSkillController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly addProjectSkill: AddProjectSkillCommand
  ) {}

  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params['projectId'] as string
    const skillId = readAliasedInput(request, 'skillId', 'skill_id') as string | undefined

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

    if (!skillId) {
      throw new BusinessLogicException('skillId is required')
    }

    const projSkill = await this.addProjectSkill.execute({
      projectId,
      skillId,
      addedBy: userId,
      auditContext: actionContextFromHttp(ctx),
    })

    response.status(HttpStatus.CREATED).json({
      data: camelizeResponseValue({
        id: projSkill.id,
        project_id: projSkill.project_id,
        skill_id: projSkill.skill_id,
        is_active: projSkill.is_active,
        is_selectable_for_tasks: projSkill.is_selectable_for_tasks,
      }),
    })
  }
}
