import type { HttpContext } from '@adonisjs/core/http'

import { ProfessionalRoleRepository } from '#modules/skills/infra/repositories/professional_role_repository'

/**
 * GET /api/v1/projects/:projectId/roles/:roleId/requirements
 * Returns the skill requirements for a project professional role.
 * Used at task creation time to prefill requirements before task exists.
 */
export default class GetRoleRequirementsController {
  async handle({ params, response }: HttpContext) {
    const projectId = String(params.projectId)
    const roleId = String(params.roleId)

    const role = await ProfessionalRoleRepository.findProjectRoleById(roleId, true)
    if (role?.project_id !== projectId) {
      response.notFound({ message: 'Role not found in project' }); return
    }

    const roleSkills = role.role_skills
    const requirements = []

    for (const rs of roleSkills) {
      const projectSkill = rs.projectSkill
      const skillId = projectSkill.skill_id

      requirements.push({
        skill_id: skillId,
        skill_name: projectSkill.skill.skill_name,
        project_skill_id: rs.project_skill_id,
        source_project_professional_role_id: roleId,
        source_role_skill_id: rs.id,
        minimum_level_id: rs.minimum_level_id,
        target_level_id: rs.target_level_id,
        assessment_ceiling_level_id: rs.assessment_ceiling_level_id,
        is_mandatory: rs.is_mandatory,
        importance: rs.importance,
        weight: rs.weight,
        requirement_source: 'professional_role_prefill',
        requirement_notes: rs.notes,
      })
    }

    response.ok({
      data: {
        role_id: roleId,
        role_name: role.name,
        requirements,
      },
    })
  }
}
