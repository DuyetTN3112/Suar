import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'
import { camelizeResponseValue } from './support/camelize_response.js'
import { readAliasedInput } from './support/read_aliased_input.js'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { actionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import { ProjectSkillService } from '#modules/skills/actions/services/project_skill_service'
import { ProjectSkillRepository } from '#modules/skills/infra/repositories/project_skill_repository'

export default class UpdateProjectSkillController {
  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const projectId = params['projectId'] as string
    const projectSkillId = params['projectSkillId'] as string

    const userId = await requireProjectAccessUserId(ctx, projectId, true)

    const displayNameOverride = readAliasedInput(
      request,
      'displayNameOverride',
      'display_name_override'
    ) as string | null | undefined
    const descriptionOverride = readAliasedInput(
      request,
      'descriptionOverride',
      'description_override'
    ) as string | null | undefined
    const rubricVersionId = readAliasedInput(request, 'rubricVersionId', 'rubric_version_id') as
      | string
      | null
      | undefined

    const projectSkillBefore = await ProjectSkillRepository.findProjectSkillById(projectSkillId)
    const original = projectSkillBefore
      ? {
          display_name_override: projectSkillBefore.display_name_override,
          description_override: projectSkillBefore.description_override,
          rubric_version_id: projectSkillBefore.rubric_version_id,
        }
      : null

    let projectSkill = await ProjectSkillService.updateOverrides(
      projectSkillId,
      omitUndefined({
        displayNameOverride,
        descriptionOverride,
      })
    )

    if (rubricVersionId !== undefined) {
      projectSkill = await ProjectSkillService.changeRubricVersion(projectSkillId, rubricVersionId)
    }

    const updated = {
      display_name_override: projectSkill.display_name_override,
      description_override: projectSkill.description_override,
      rubric_version_id: projectSkill.rubric_version_id,
    }

    await auditPublicApi.log(
      {
        user_id: userId,
        action: 'update',
        entity_type: 'project_skill',
        entity_id: projectSkillId,
        old_values: original,
        new_values: updated,
      },
      actionContextFromHttp(ctx)
    )

    return {
      data: camelizeResponseValue({
        id: projectSkill.id,
        project_id: projectSkill.project_id,
        skill_id: projectSkill.skill_id,
        display_name_override: projectSkill.display_name_override,
        description_override: projectSkill.description_override,
        rubric_version_id: projectSkill.rubric_version_id,
        is_active: projectSkill.is_active,
        is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
      }),
    }
  }
}
