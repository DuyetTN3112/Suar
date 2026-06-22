/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import type { HttpContext } from '@adonisjs/core/http'

import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class ListRoleTemplatesController {
  async handle({ response }: HttpContext) {
    const templates = await ProfessionalRoleRepository.listActiveTemplatesWithSkillDetails()

    response.ok({
      data: templates.map((t) => ({
        id: t.id,
        code: t.code,
        name: t.name,
        description: t.description,
        is_active: t.is_active,
        skills: t.template_skills.map((ts) => ({
          id: ts.id,
          skill_id: ts.skill_id,
          skill: ts.skill ? {
            id: ts.skill.id,
            skill_code: ts.skill.skill_code,
            skill_name: ts.skill.skill_name,
            category_code: ts.skill.category_code,
          } : null,
          minimum_level: ts.minimumLevel ? {
            id: ts.minimumLevel.id,
            code: ts.minimumLevel.code,
            ordinal: ts.minimumLevel.ordinal,
            display_name: ts.minimumLevel.display_name,
          } : null,
          target_level: ts.targetLevel ? {
            id: ts.targetLevel.id,
            code: ts.targetLevel.code,
            ordinal: ts.targetLevel.ordinal,
            display_name: ts.targetLevel.display_name,
          } : null,
          assessment_ceiling_level: ts.assessmentCeilingLevel ? {
            id: ts.assessmentCeilingLevel.id,
            code: ts.assessmentCeilingLevel.code,
            ordinal: ts.assessmentCeilingLevel.ordinal,
            display_name: ts.assessmentCeilingLevel.display_name,
          } : null,
          is_mandatory: ts.is_mandatory,
          importance: ts.importance,
          weight: ts.weight,
          sort_order: ts.sort_order,
        })),
      })),
    })
  }
}
