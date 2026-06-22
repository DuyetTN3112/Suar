/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { HttpContext } from '@adonisjs/core/http'

import { checkProjectPermission } from './project_auth_helper.js'

import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class ListProjectRolesController {
  async handle(ctx: HttpContext) {
    const { params, response } = ctx
    const projectId = params.projectId as string

    await checkProjectPermission(ctx, projectId, false)

    const roles = await ProfessionalRoleRepository.listProjectRolesWithSkillDetails(projectId)

    response.ok({
      data: roles.map((role) => ({
        id: role.id,
        project_id: role.project_id,
        code: role.code,
        name: role.name,
        description: role.description,
        is_active: role.is_active,
        version: role.version,
        source_template: role.sourceTemplate ? {
          id: role.sourceTemplate.id,
          code: role.sourceTemplate.code,
          name: role.sourceTemplate.name,
        } : null,
        skills: role.role_skills.map((rs) => ({
          id: rs.id,
          project_skill_id: rs.project_skill_id,
          skill: rs.projectSkill?.skill ? {
            id: rs.projectSkill.skill.id,
            skill_code: rs.projectSkill.skill.skill_code,
            skill_name: rs.projectSkill.skill.skill_name,
            category_code: rs.projectSkill.skill.category_code,
          } : null,
          minimum_level: rs.minimumLevel ? {
            id: rs.minimumLevel.id,
            code: rs.minimumLevel.code,
            ordinal: rs.minimumLevel.ordinal,
            display_name: rs.minimumLevel.display_name,
          } : null,
          target_level: rs.targetLevel ? {
            id: rs.targetLevel.id,
            code: rs.targetLevel.code,
            ordinal: rs.targetLevel.ordinal,
            display_name: rs.targetLevel.display_name,
          } : null,
          assessment_ceiling_level: rs.assessmentCeilingLevel ? {
            id: rs.assessmentCeilingLevel.id,
            code: rs.assessmentCeilingLevel.code,
            ordinal: rs.assessmentCeilingLevel.ordinal,
            display_name: rs.assessmentCeilingLevel.display_name,
          } : null,
          is_mandatory: rs.is_mandatory,
          importance: rs.importance,
          weight: rs.weight,
          sort_order: rs.sort_order,
          notes: rs.notes,
        })),
      })),
    })
  }
}
