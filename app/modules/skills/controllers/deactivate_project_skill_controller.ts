import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'

export default class DeactivateProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params.projectId as string
    const projectSkillId = params.projectSkillId as string

    const userId = await checkProjectPermission(ctx, projectId, true)

    const projectSkill = await ProjectSkillService.deactivateProjectSkill(projectSkillId)

    await auditPublicApi.log({
      user_id: userId,
      action: 'deactivate',
      entity_type: 'project_skill',
      entity_id: projectSkillId,
      old_values: { is_active: true },
      new_values: { is_active: false },
    }, actionContextFromHttp(ctx))

    response.ok({
      data: {
        id: projectSkill.id,
        project_id: projectSkill.project_id,
        skill_id: projectSkill.skill_id,
        is_active: projectSkill.is_active,
        is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
      },
    });
  }
}
