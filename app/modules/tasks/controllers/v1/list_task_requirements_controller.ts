import type { HttpContext } from '@adonisjs/core/http'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'

export default class ListTaskRequirementsController {
  async handle({ params, response }: HttpContext) {
    const taskId = String(params.taskId)

    try {
      const requirements = await TaskSkillRequirementService.getRequirements(taskId)

      response.ok({
        data: requirements.map((r) => ({
          id: r.id,
          task_id: r.task_id,
          skill_id: r.skill_id,
          project_skill_id: r.project_skill_id,
          source_project_professional_role_id: r.source_project_professional_role_id,
          minimum_level_id: r.minimum_level_id,
          target_level_id: r.target_level_id,
          assessment_ceiling_level_id: r.assessment_ceiling_level_id,
          is_mandatory: r.is_mandatory,
          importance: r.importance,
          weight: r.weight,
          requirement_source: r.requirement_source,
          requirement_notes: r.requirement_notes,
          skill: {
                id: r.skill.id,
                skill_name: r.skill.skill_name,
                skill_code: r.skill.skill_code,
                category_code: r.skill.category_code,
              },
          minimum_level: r.minimumLevel
            ? {
                id: r.minimumLevel.id,
                ordinal: r.minimumLevel.ordinal,
                code: r.minimumLevel.code,
                display_name: r.minimumLevel.display_name,
                short_name: r.minimumLevel.short_name,
                generic_description: r.minimumLevel.generic_description,
              }
            : null,
          target_level: r.targetLevel
            ? {
                id: r.targetLevel.id,
                ordinal: r.targetLevel.ordinal,
                code: r.targetLevel.code,
                display_name: r.targetLevel.display_name,
                short_name: r.targetLevel.short_name,
                generic_description: r.targetLevel.generic_description,
              }
            : null,
          assessment_ceiling_level: r.assessmentCeilingLevel
            ? {
                id: r.assessmentCeilingLevel.id,
                ordinal: r.assessmentCeilingLevel.ordinal,
                code: r.assessmentCeilingLevel.code,
                display_name: r.assessmentCeilingLevel.display_name,
                short_name: r.assessmentCeilingLevel.short_name,
                generic_description: r.assessmentCeilingLevel.generic_description,
              }
            : null,
          rubric_version: r.rubricVersion
            ? {
                id: r.rubricVersion.id,
                version: r.rubricVersion.version,
                status: r.rubricVersion.status,
              }
            : null,
        })),
      }); return;
    } catch (err) {
      response.internalServerError({ message: 'Failed to fetch requirements', error: String(err) }); return;
    }
  }
}
