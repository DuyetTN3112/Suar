import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'

function validationErrors(err: unknown) {
  return err && typeof err === 'object' && 'messages' in err ? err.messages : err
}

const addRequirementSchema = vine.compile(
  vine.object({
    skill_id: vine.string().uuid(),
    project_skill_id: vine.string().uuid().optional().nullable(),
    source_project_professional_role_id: vine.string().uuid().optional().nullable(),
    minimum_level_id: vine.string().uuid().optional().nullable(),
    target_level_id: vine.string().uuid().optional().nullable(),
    assessment_ceiling_level_id: vine.string().uuid().optional().nullable(),
    is_mandatory: vine.boolean().optional(),
    importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
    weight: vine.number().min(0).optional(),
    requirement_notes: vine.string().maxLength(1000).optional().nullable(),
  })
)

export default class AddTaskRequirementController {
  async handle({ params, request, response }: HttpContext) {
    const taskId = String(params.taskId)

    let payload
    try {
      payload = await request.validateUsing(addRequirementSchema)
    } catch (err) {
      response.unprocessableEntity({ message: 'Validation failed', errors: validationErrors(err) }); return;
    }

    try {
      const requirement = await TaskSkillRequirementService.addRequirement(taskId, {
        skillId: payload.skill_id,
        projectSkillId: payload.project_skill_id,
        sourceProjectProfessionalRoleId: payload.source_project_professional_role_id,
        minimumLevelId: payload.minimum_level_id,
        targetLevelId: payload.target_level_id,
        assessmentCeilingLevelId: payload.assessment_ceiling_level_id,
        isMandatory: payload.is_mandatory,
        importance: payload.importance,
        weight: payload.weight,
        requirementNotes: payload.requirement_notes,
        requirementSource: 'manual',
      })

      response.created({ data: requirement }); return;
    } catch (err) {
      response.badRequest({ message: String(err) }); return;
    }
  }
}
