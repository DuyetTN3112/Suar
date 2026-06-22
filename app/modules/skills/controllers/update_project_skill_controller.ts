import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'

export default class UpdateProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, request, response } = ctx
    const projectId = params.projectId as string
    const projectSkillId = params.projectSkillId as string

    const userId = await checkProjectPermission(ctx, projectId, true)

    const displayNameOverride = request.input('display_name_override') as string | null | undefined
    const descriptionOverride = request.input('description_override') as string | null | undefined
    const rubricVersionId = request.input('rubric_version_id') as string | null | undefined

    const projectSkillBefore = await ProjectSkillRepository.findProjectSkillById(projectSkillId)
    const original = projectSkillBefore ? {
      display_name_override: projectSkillBefore.display_name_override,
      description_override: projectSkillBefore.description_override,
      rubric_version_id: projectSkillBefore.rubric_version_id,
    } : null

    let projectSkill = await ProjectSkillService.updateOverrides(projectSkillId, {
      displayNameOverride: displayNameOverride !== undefined ? displayNameOverride : undefined,
      descriptionOverride: descriptionOverride !== undefined ? descriptionOverride : undefined,
    })

    if (rubricVersionId !== undefined) {
      projectSkill = await ProjectSkillService.changeRubricVersion(projectSkillId, rubricVersionId)
    }

    const updated = {
      display_name_override: projectSkill.display_name_override,
      description_override: projectSkill.description_override,
      rubric_version_id: projectSkill.rubric_version_id,
    }

    await auditPublicApi.log({
      user_id: userId,
      action: 'update',
      entity_type: 'project_skill',
      entity_id: projectSkillId,
      old_values: original,
      new_values: updated,
    }, actionContextFromHttp(ctx))

    response.ok({
      data: {
        id: projectSkill.id,
        project_id: projectSkill.project_id,
        skill_id: projectSkill.skill_id,
        display_name_override: projectSkill.display_name_override,
        description_override: projectSkill.description_override,
        rubric_version_id: projectSkill.rubric_version_id,
        is_active: projectSkill.is_active,
        is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
      },
    });
  }
}
