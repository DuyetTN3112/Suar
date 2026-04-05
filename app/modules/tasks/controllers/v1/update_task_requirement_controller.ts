import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
import { camelizeResponseValue } from '#modules/tasks/controllers/v1/support/camelize_response'
import { readAliasedInput } from '#modules/tasks/controllers/v1/support/read_aliased_input'
import {
  throwTaskRequirementBoundaryError,
  throwTaskRequirementValidationError,
} from '#modules/tasks/controllers/v1/support/task_requirement_api_errors'

const updateRequirementSchema = vine.create({
  minimumLevelId: vine.string().uuid().optional().nullable(),
  targetLevelId: vine.string().uuid().optional().nullable(),
  assessmentCeilingLevelId: vine.string().uuid().optional().nullable(),
  isMandatory: vine.boolean().optional(),
  importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
  weight: vine.number().min(0).optional(),
  requirementNotes: vine.string().maxLength(1000).optional().nullable(),
})

type UpdateRequirementPayload = Awaited<ReturnType<typeof updateRequirementSchema.validate>>

export default class UpdateTaskRequirementController {
  async handle({ params, request }: HttpContext) {
    const requirementId = String(params['requirementId'])

    let payload: UpdateRequirementPayload
    try {
      payload = await updateRequirementSchema.validate({
        minimumLevelId: readAliasedInput(request, 'minimumLevelId', 'minimum_level_id'),
        targetLevelId: readAliasedInput(request, 'targetLevelId', 'target_level_id'),
        assessmentCeilingLevelId: readAliasedInput(
          request,
          'assessmentCeilingLevelId',
          'assessment_ceiling_level_id'
        ),
        isMandatory: readAliasedInput(request, 'isMandatory', 'is_mandatory'),
        importance: readAliasedInput(request, 'importance', 'importance'),
        weight: readAliasedInput(request, 'weight', 'weight'),
        requirementNotes: readAliasedInput(request, 'requirementNotes', 'requirement_notes'),
      })
    } catch (err) {
      throwTaskRequirementValidationError(err)
    }

    try {
      const updated = await TaskSkillRequirementService.updateRequirement(requirementId, omitUndefined({
        minimumLevelId: payload.minimumLevelId,
        targetLevelId: payload.targetLevelId,
        assessmentCeilingLevelId: payload.assessmentCeilingLevelId,
        isMandatory: payload.isMandatory,
        importance: payload.importance,
        weight: payload.weight,
        requirementNotes: payload.requirementNotes,
      }))

      return { data: camelizeResponseValue(updated.serialize()) }
    } catch (err) {
      throwTaskRequirementBoundaryError(err)
    }
  }
}
