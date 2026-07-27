import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from '../mappers/request/skill-catalog/read_aliased_input.js'
import { camelizeResponseValue } from '../mappers/response/skill-catalog/camelize_response.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'

@inject()
export default class UpdateProjectSkillController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const request = ctx.request
    const result = await this.actions
      .makeUpdateSkill(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId: String(ctx.params['projectId']),
        projectSkillId: String(ctx.params['projectSkillId']),
        auditContext: actionContextFromHttp(ctx),
        ...(readAliasedInput(request, 'displayNameOverride', 'display_name_override') === undefined
          ? {}
          : {
              displayNameOverride: readAliasedInput(
                request,
                'displayNameOverride',
                'display_name_override'
              ) as string | null,
            }),
        ...(readAliasedInput(request, 'descriptionOverride', 'description_override') === undefined
          ? {}
          : {
              descriptionOverride: readAliasedInput(
                request,
                'descriptionOverride',
                'description_override'
              ) as string | null,
            }),
        ...(readAliasedInput(request, 'rubricVersionId', 'rubric_version_id') === undefined
          ? {}
          : {
              rubricVersionId: readAliasedInput(request, 'rubricVersionId', 'rubric_version_id') as
                | string
                | null,
            }),
        ...(readAliasedInput(request, 'isActive', 'is_active') === undefined
          ? {}
          : {
              isActive:
                readAliasedInput(request, 'isActive', 'is_active') === true ||
                readAliasedInput(request, 'isActive', 'is_active') === 'true' ||
                readAliasedInput(request, 'isActive', 'is_active') === 1,
            }),
        ...(readAliasedInput(
          request,
          'minimumTaskRequirementLevelId',
          'minimum_task_requirement_level_id'
        ) === undefined
          ? {}
          : {
              minimumTaskRequirementLevelId: readAliasedInput(
                request,
                'minimumTaskRequirementLevelId',
                'minimum_task_requirement_level_id'
              ) as string | null,
            }),
        ...(readAliasedInput(
          request,
          'maximumTaskRequirementLevelId',
          'maximum_task_requirement_level_id'
        ) === undefined
          ? {}
          : {
              maximumTaskRequirementLevelId: readAliasedInput(
                request,
                'maximumTaskRequirementLevelId',
                'maximum_task_requirement_level_id'
              ) as string | null,
            }),
      })
      .then((outcome) => outcome.getValue())

    return { data: camelizeResponseValue(result.projectSkill) }
  }
}
