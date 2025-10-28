import type { HttpContext } from '@adonisjs/core/http'

import { requireProjectAccessUserId } from './project_access_guard.js'
import { camelizeResponseValue } from './support/camelize_response.js'

import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class ListProjectRolesController {
  async handle(ctx: HttpContext) {
    const { params } = ctx
    const projectId = params['projectId'] as string

    await requireProjectAccessUserId(ctx, projectId, false)

    const roles = await ProfessionalRoleRepository.listProjectRolesWithSkillDetails(projectId)

    return {
      data: camelizeResponseValue(
        roles.map((role) => {
          const sourceTemplate = role.sourceTemplate as typeof role.sourceTemplate | null

          return {
            id: role.id,
            project_id: role.project_id,
            code: role.code,
            name: role.name,
            description: role.description,
            is_active: role.is_active,
            version: role.version,
            source_template: sourceTemplate ? {
              id: sourceTemplate.id,
              code: sourceTemplate.code,
              name: sourceTemplate.name,
            } : null,
            skills: role.role_skills.map((rs) => {
              const projectSkill = rs.projectSkill as typeof rs.projectSkill | null
              const skill = projectSkill ? (projectSkill.skill as typeof projectSkill.skill | null) : null
              const minimumLevel = rs.minimumLevel as typeof rs.minimumLevel | null
              const targetLevel = rs.targetLevel as typeof rs.targetLevel | null
              const assessmentCeilingLevel = rs.assessmentCeilingLevel as typeof rs.assessmentCeilingLevel | null

              return {
                id: rs.id,
                project_skill_id: rs.project_skill_id,
                skill: skill ? {
                  id: skill.id,
                  skill_code: skill.skill_code,
                  skill_name: skill.skill_name,
                  category_code: skill.category_code,
                } : null,
                minimum_level: minimumLevel ? {
                  id: minimumLevel.id,
                  code: minimumLevel.code,
                  ordinal: minimumLevel.ordinal,
                  display_name: minimumLevel.display_name,
                } : null,
                target_level: targetLevel ? {
                  id: targetLevel.id,
                  code: targetLevel.code,
                  ordinal: targetLevel.ordinal,
                  display_name: targetLevel.display_name,
                } : null,
                assessment_ceiling_level: assessmentCeilingLevel ? {
                  id: assessmentCeilingLevel.id,
                  code: assessmentCeilingLevel.code,
                  ordinal: assessmentCeilingLevel.ordinal,
                  display_name: assessmentCeilingLevel.display_name,
                } : null,
                is_mandatory: rs.is_mandatory,
                importance: rs.importance,
                weight: rs.weight,
                sort_order: rs.sort_order,
                notes: rs.notes,
              }
            }),
          }
        })
      ),
    }
  }
}
