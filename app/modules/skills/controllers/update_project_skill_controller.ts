import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from './mappers/request/read_aliased_input.js'
import { camelizeResponseValue } from './mappers/response/camelize_response.js'
import { SkillProjectAccessGuard } from './project_access_guard.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import UpdateProjectSkillCommand from '#modules/skills/actions/commands/update_project_skill_command'

@inject()
export default class UpdateProjectSkillController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly updateProjectSkill: UpdateProjectSkillCommand
  ) {}

  async handle(ctx: HttpContext) {
    const { params, request } = ctx
    const projectId = params['projectId'] as string
    const projectSkillId = params['projectSkillId'] as string

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

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

    const { projectSkill } = await this.updateProjectSkill.execute({
      projectSkillId,
      actorId: userId,
      auditContext: actionContextFromHttp(ctx),
      ...(displayNameOverride === undefined ? {} : { displayNameOverride }),
      ...(descriptionOverride === undefined ? {} : { descriptionOverride }),
      ...(rubricVersionId === undefined ? {} : { rubricVersionId }),
    })

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
