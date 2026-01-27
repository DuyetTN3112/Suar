import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  readAddProjectRoleSkillInput,
  readUpdateProjectRoleSkillInput,
} from './mappers/request/project_role_skill_request.js'
import { camelizeResponseValue } from './mappers/response/camelize_response.js'
import { SkillProjectAccessGuard } from './project_access_guard.js'

import { actionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import AddProjectRoleSkillCommand from '#modules/skills/actions/commands/add_project_role_skill_command'
import UpdateProjectRoleSkillCommand from '#modules/skills/actions/commands/update_project_role_skill_command'
import type { ProjectRoleSkillResponseRecord } from '#modules/skills/actions/dtos/project_role_skill_response'

@inject()
export default class UpdateProjectRoleSkillController {
  constructor(
    private readonly projectAccess: SkillProjectAccessGuard,
    private readonly addProjectRoleSkill: AddProjectRoleSkillCommand,
    private readonly updateProjectRoleSkill: UpdateProjectRoleSkillCommand
  ) {}

  async handle(ctx: HttpContext) {
    const projectId = String(ctx.params['projectId'])
    const roleId = String(ctx.params['roleId'])
    const roleSkillId =
      ctx.params['roleSkillId'] === undefined ? undefined : String(ctx.params['roleSkillId'])

    const userId = await this.projectAccess.requireUserId(ctx, projectId, true)

    if (roleSkillId) {
      return this.updateExistingRoleSkill(ctx, userId, roleSkillId)
    }

    return this.addRoleSkill(ctx, userId, roleId)
  }

  private async updateExistingRoleSkill(ctx: HttpContext, userId: string, roleSkillId: string) {
    const input = readUpdateProjectRoleSkillInput(ctx.request, roleSkillId)
    const { roleSkill } = await this.updateProjectRoleSkill.execute(input, {
      actorId: userId,
      context: actionContextFromHttp(ctx),
    })

    return { data: camelizeResponseValue(this.toResponseValues(roleSkill)) }
  }

  private async addRoleSkill(ctx: HttpContext, userId: string, roleId: string) {
    const input = readAddProjectRoleSkillInput(ctx.request, roleId)
    const created = await this.addProjectRoleSkill.execute(input, {
      actorId: userId,
      context: actionContextFromHttp(ctx),
    })

    return ctx.response.created({ data: camelizeResponseValue(this.toResponseValues(created)) })
  }

  private toResponseFields(roleSkill: ProjectRoleSkillResponseRecord) {
    return {
      minimum_level_id: roleSkill.minimum_level_id,
      target_level_id: roleSkill.target_level_id,
      assessment_ceiling_level_id: roleSkill.assessment_ceiling_level_id,
      is_mandatory: roleSkill.is_mandatory,
      importance: roleSkill.importance,
      weight: roleSkill.weight,
      sort_order: roleSkill.sort_order,
      notes: roleSkill.notes,
    }
  }

  private toResponseValues(roleSkill: ProjectRoleSkillResponseRecord) {
    return {
      id: roleSkill.id,
      project_professional_role_id: roleSkill.project_professional_role_id,
      project_skill_id: roleSkill.project_skill_id,
      ...this.toResponseFields(roleSkill),
    }
  }
}
