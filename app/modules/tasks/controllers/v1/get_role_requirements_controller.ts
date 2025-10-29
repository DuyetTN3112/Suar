import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from './support/camelize_response.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/proficiency_framework'
import { skillPublicApi } from '#modules/skills/public_contracts/skill_public_api'

/**
 * GET /api/v1/projects/:projectId/roles/:roleId/requirements
 * Returns the skill requirements for a project professional role.
 * Used at task creation time to prefill requirements before task exists.
 */
export default class GetRoleRequirementsController {
  async handle({ params }: HttpContext) {
    const projectId = String(params['projectId'])
    const roleId = String(params['roleId'])

    const role = await skillPublicApi.findProjectProfessionalRoleById(roleId, true)
    if (role?.project_id !== projectId) {
      throw new NotFoundException('Role not found in project')
    }

    const roleSkills = role.role_skills
    const levelIds = roleSkills.flatMap((rs) =>
      [rs.minimum_level_id, rs.target_level_id, rs.assessment_ceiling_level_id].filter(
        (value): value is string => Boolean(value)
      )
    )
    const levels = await skillPublicApi.findProficiencyLevelsByIds(levelIds)
    const levelsById = new Map(levels.map((level) => [level.id, level]))
    const requirements = []

    for (const rs of roleSkills) {
      const projectSkill = rs.projectSkill
      const skillId = projectSkill.skill_id
      const levelId =
        rs.minimum_level_id ?? rs.target_level_id ?? rs.assessment_ceiling_level_id ?? null
      const levelCode = levelId ? levelsById.get(levelId)?.code : null

      requirements.push({
        skill_id: skillId,
        skill_name: projectSkill.skill.skill_name,
        category_code: projectSkill.skill.category_code,
        project_skill_id: rs.project_skill_id,
        source_project_professional_role_id: roleId,
        source_role_skill_id: rs.id,
        minimum_level_id: rs.minimum_level_id,
        target_level_id: rs.target_level_id,
        assessment_ceiling_level_id: rs.assessment_ceiling_level_id,
        minimum_level_code: rs.minimum_level_id
          ? getCanonicalProficiencyLevelValue(levelsById.get(rs.minimum_level_id)?.code, '') || null
          : null,
        target_level_code: rs.target_level_id
          ? getCanonicalProficiencyLevelValue(levelsById.get(rs.target_level_id)?.code, '') || null
          : null,
        assessment_ceiling_level_code: rs.assessment_ceiling_level_id
          ? getCanonicalProficiencyLevelValue(
              levelsById.get(rs.assessment_ceiling_level_id)?.code,
              ''
            ) || null
          : null,
        required_level_code: getCanonicalProficiencyLevelValue(levelCode, 'l4'),
        is_mandatory: rs.is_mandatory,
        importance: rs.importance,
        weight: rs.weight,
        requirement_source: 'professional_role_prefill',
        requirement_notes: rs.notes,
      })
    }

    return {
      data: camelizeResponseValue({
        role_id: roleId,
        role_name: role.name,
        requirements,
      }),
    }
  }
}
