import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  readAddProjectRoleSkillInput,
  readUpdateProjectRoleSkillInput,
} from '../mappers/request/project-roles/project_role_skill_request.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'
import type { ProjectProfessionalRoleSkillRecord } from '#modules/skills/actions/ports/outbound/professional_role_repository'

function toProjectRoleSkillResponse(roleSkill: ProjectProfessionalRoleSkillRecord) {
  const response: Record<string, unknown> = {
    id: roleSkill.id,
    projectSkillId: roleSkill.project_skill_id,
  }

  const optionalValues: Record<string, unknown> = {
    projectProfessionalRoleId: roleSkill.project_professional_role_id,
    minimumLevelId: roleSkill.minimum_level_id,
    targetLevelId: roleSkill.target_level_id,
    assessmentCeilingLevelId: roleSkill.assessment_ceiling_level_id,
    isMandatory: roleSkill.is_mandatory,
    importance: roleSkill.importance,
    weight: roleSkill.weight,
    sortOrder: roleSkill.sort_order,
    notes: roleSkill.notes,
  }
  for (const [key, value] of Object.entries(optionalValues)) {
    if (value !== undefined) response[key] = value
  }

  return response
}

@inject()
export default class UpdateProjectRoleSkillController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const projectId = String(ctx.params['projectId'])
    const roleId = String(ctx.params['roleId'])
    const roleSkillId =
      ctx.params['roleSkillId'] === undefined ? undefined : String(ctx.params['roleSkillId'])
    const auditContext = actionContextFromHttp(ctx)

    if (roleSkillId) {
      const input = readUpdateProjectRoleSkillInput(ctx.request, roleSkillId)
      const result = await this.actions
        .makeUpsertRoleSkill(auditContext)
        .executeAndWrap({
          projectId,
          roleId,
          auditContext,
          mutation: { kind: 'update', input },
        })
        .then((outcome) => outcome.getValue())
      return { data: toProjectRoleSkillResponse(result.roleSkill) }
    }

    const input = readAddProjectRoleSkillInput(ctx.request, roleId)
    const result = await this.actions
      .makeUpsertRoleSkill(auditContext)
      .executeAndWrap({
        projectId,
        roleId,
        auditContext,
        mutation: { kind: 'add', input },
      })
      .then((outcome) => outcome.getValue())
    return ctx.response.created({ data: toProjectRoleSkillResponse(result.roleSkill) })
  }
}
