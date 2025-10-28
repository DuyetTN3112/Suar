import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'
import { camelizeResponseValue } from './support/camelize_response.js'
import { readAliasedInput } from './support/read_aliased_input.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'

export default class AddProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params['projectId'] as string
    const skillId = readAliasedInput(request, 'skillId', 'skill_id') as string | undefined

    const userId = await requireProjectAccessUserId(ctx, projectId, true)

    if (!skillId) {
      throw new BusinessLogicException('skillId is required')
    }

    const projSkill = await ProjectSkillService.addSkillToProject({
      projectId,
      skillId,
      addedBy: userId,
    })

    await auditPublicApi.log({
      user_id: userId,
      action: 'create',
      entity_type: 'project_skill',
      entity_id: projSkill.id,
      old_values: null,
      new_values: {
        project_id: projSkill.project_id,
        skill_id: projSkill.skill_id,
      },
    }, actionContextFromHttp(ctx))

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
