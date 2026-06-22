import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'

export default class AddProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params.projectId as string
    const skillId = request.input('skill_id') as string

    const userId = await checkProjectPermission(ctx, projectId, true)

    if (!skillId) {
      response.badRequest({ message: 'skill_id is required' }); return;
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

    response.created({
      data: {
        id: projSkill.id,
        project_id: projSkill.project_id,
        skill_id: projSkill.skill_id,
        is_active: projSkill.is_active,
        is_selectable_for_tasks: projSkill.is_selectable_for_tasks,
      },
    });
  }
}
