import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { readAliasedInput } from '../mappers/request/skill-catalog/read_aliased_input.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'
import type { ProjectProfessionalRoleRecord } from '#modules/skills/actions/ports/outbound/professional_role_repository'

function toProjectRoleResponse(role: ProjectProfessionalRoleRecord) {
  const response: Record<string, unknown> = {
    id: role.id,
    projectId: role.project_id,
  }

  const optionalValues: Record<string, unknown> = {
    sourceTemplateId: role.source_template_id,
    code: role.code,
    name: role.name,
    description: role.description,
    isActive: role.is_active,
    version: role.version,
    createdBy: role.created_by,
  }
  for (const [key, value] of Object.entries(optionalValues)) {
    if (value !== undefined) response[key] = value
  }

  return response
}

@inject()
export default class CreateProjectRoleController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const role = await this.actions
      .makeCreateRole(actionContextFromHttp(ctx))
      .executeAndWrap({
        projectId: String(ctx.params['projectId']),
        ...(readAliasedInput(ctx.request, 'templateId', 'template_id') === undefined
          ? {}
          : { templateId: readAliasedInput(ctx.request, 'templateId', 'template_id') as string }),
        ...(ctx.request.input('code') === undefined
          ? {}
          : { code: ctx.request.input('code') as string }),
        ...(ctx.request.input('name') === undefined
          ? {}
          : { name: ctx.request.input('name') as string }),
        ...(ctx.request.input('description') === undefined
          ? {}
          : { description: ctx.request.input('description') as string }),
        auditContext: actionContextFromHttp(ctx),
      })
      .then((outcome) => outcome.getValue())
    return ctx.response.created({ data: toProjectRoleResponse(role) })
  }
}
