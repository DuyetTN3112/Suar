import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'

function validationErrors(err: unknown) {
  return err && typeof err === 'object' && 'messages' in err ? err.messages : err
}

const updateRequirementSchema = vine.compile(
  vine.object({
    minimum_level_id: vine.string().uuid().optional().nullable(),
    target_level_id: vine.string().uuid().optional().nullable(),
    assessment_ceiling_level_id: vine.string().uuid().optional().nullable(),
    is_mandatory: vine.boolean().optional(),
    importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
    weight: vine.number().min(0).optional(),
    requirement_notes: vine.string().maxLength(1000).optional().nullable(),
  })
)

export default class UpdateTaskRequirementController {
  async handle({ params, request, response }: HttpContext) {
    const requirementId = String(params.requirementId)

    let payload
    try {
      payload = await request.validateUsing(updateRequirementSchema)
    } catch (err) {
      response.unprocessableEntity({ message: 'Validation failed', errors: validationErrors(err) }); return;
    }

    try {
      const updated = await TaskSkillRequirementService.updateRequirement(requirementId, {
        minimumLevelId: payload.minimum_level_id,
        targetLevelId: payload.target_level_id,
        assessmentCeilingLevelId: payload.assessment_ceiling_level_id,
        isMandatory: payload.is_mandatory,
        importance: payload.importance,
        weight: payload.weight,
        requirementNotes: payload.requirement_notes,
      })

      response.ok({ data: updated }); return;
    } catch (err) {
      response.badRequest({ message: String(err) }); return;
    }
  }
}
