import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { HttpStatus } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'

export default class DeactivateProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params['projectId'] as string
    const projectSkillId = params['projectSkillId'] as string

    const userId = await requireProjectAccessUserId(ctx, projectId, true)

    await ProjectSkillService.deactivateProjectSkill(projectSkillId)

    await auditPublicApi.log({
      user_id: userId,
      action: 'deactivate',
      entity_type: 'project_skill',
      entity_id: projectSkillId,
      old_values: { is_active: true },
      new_values: { is_active: false },
    }, actionContextFromHttp(ctx))

    response.status(HttpStatus.NO_CONTENT).send(null)
  }
}
