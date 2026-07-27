import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { SkillProjectActionFactory } from '#modules/skills/actions/ports/inbound/skill_project_action_factory'
import type {
  ProjectProfessionalRoleRecord,
  ProjectProfessionalRoleSkillRecord,
} from '#modules/skills/actions/ports/outbound/professional_role_repository'

function toProjectRoleResponse(role: ProjectProfessionalRoleRecord) {
  const response: Record<string, unknown> = {
    id: role.id,
    projectId: role.project_id,
    sourceTemplate: role.sourceTemplate
      ? {
          id: role.sourceTemplate.id,
          code: role.sourceTemplate.code,
          name: role.sourceTemplate.name,
        }
      : null,
    skills: role.role_skills.map((skill: ProjectProfessionalRoleSkillRecord) => ({
      id: skill.id,
      projectSkillId: skill.project_skill_id,
      minimumLevel: skill.minimumLevel
        ? { id: skill.minimumLevel.id, displayName: skill.minimumLevel.display_name }
        : null,
      targetLevel: skill.targetLevel
        ? { id: skill.targetLevel.id, displayName: skill.targetLevel.display_name }
        : null,
      assessmentCeilingLevel: skill.assessmentCeilingLevel
        ? { id: skill.assessmentCeilingLevel.id, displayName: skill.assessmentCeilingLevel.display_name }
        : null,
      isMandatory: skill.is_mandatory,
      importance: skill.importance,
      weight: skill.weight,
      sortOrder: skill.sort_order,
      notes: skill.notes,
      skill: {
        skillName: skill.projectSkill.skill.skill_name,
        categoryCode: skill.projectSkill.skill.category_code,
      },
    })),
  }

  const optionalValues: Record<string, unknown> = {
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
export default class ListProjectRolesController {
  constructor(private readonly actions: SkillProjectActionFactory) {}

  async handle(ctx: HttpContext) {
    const roles = await this.actions
      .makeListRoles(actionContextFromHttp(ctx))
      .executeAndWrap(String(ctx.params['projectId']))
      .then((outcome) => outcome.getValue())
    return { data: roles.map(toProjectRoleResponse) }
  }
}
