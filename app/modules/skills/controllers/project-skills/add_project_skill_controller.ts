import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from '../mappers/request/skill-catalog/read_aliased_input.js'
import { camelizeResponseValue } from '../mappers/response/skill-catalog/camelize_response.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'

@inject()
export default class AddProjectSkillController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const projectId = String(ctx.params['projectId'])
    const skillId = readAliasedInput(ctx.request, 'skillId', 'skill_id') as string | undefined
    const minimumTaskRequirementLevelId = readAliasedInput(
      ctx.request,
      'minimumTaskRequirementLevelId',
      'minimum_task_requirement_level_id'
    ) as string | null | undefined
    const maximumTaskRequirementLevelId = readAliasedInput(
      ctx.request,
      'maximumTaskRequirementLevelId',
      'maximum_task_requirement_level_id'
    ) as string | null | undefined
    const projectSkill = await this.actions
      .makeAddSkill(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId,
        ...(skillId === undefined ? {} : { skillId }),
        ...(minimumTaskRequirementLevelId === undefined
          ? {}
          : { minimumTaskRequirementLevelId }),
        ...(maximumTaskRequirementLevelId === undefined
          ? {}
          : { maximumTaskRequirementLevelId }),
        auditContext: actionContextFromHttp(ctx),
      })
      .then((outcome) => outcome.getValue())

    return ctx.response.created({
      data: camelizeResponseValue({
        id: projectSkill.id,
        project_id: projectSkill.project_id,
        skill_id: projectSkill.skill_id,
        is_active: projectSkill.is_active,
        is_selectable_for_tasks: projectSkill.is_selectable_for_tasks,
        minimum_task_requirement_level_id: projectSkill.minimum_task_requirement_level_id,
        maximum_task_requirement_level_id: projectSkill.maximum_task_requirement_level_id,
      }),
    })
  }
}
