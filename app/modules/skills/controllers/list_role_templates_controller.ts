import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from './support/camelize_response.js'

import { wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

export default class ListRoleTemplatesController {
  async handle({}: HttpContext) {
    const templates = await ProfessionalRoleRepository.listActiveTemplatesWithSkillDetails()

    return wrapApiV1Data(
      camelizeResponseValue(
        templates.map((t) => ({
          id: t.id,
          code: t.code,
          name: t.name,
          description: t.description,
          is_active: t.is_active,
          skills: t.template_skills.map((ts) => {
            const skill = ts.skill as typeof ts.skill | null
            const minimumLevel = ts.minimumLevel as typeof ts.minimumLevel | null
            const targetLevel = ts.targetLevel as typeof ts.targetLevel | null
            const assessmentCeilingLevel = ts.assessmentCeilingLevel as typeof ts.assessmentCeilingLevel | null

            return {
              id: ts.id,
              skill_id: ts.skill_id,
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
              is_mandatory: ts.is_mandatory,
              importance: ts.importance,
              weight: ts.weight,
              sort_order: ts.sort_order,
            }
          }),
        }))
      )
    )
  }
}
