import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'
import UpdateTaskRequirementCommand from '#modules/tasks/actions/commands/update_task_requirement_command'

const updateRequirementSchema = vine.create({
  minimumLevelId: vine.string().uuid().optional().nullable(),
  targetLevelId: vine.string().uuid().optional().nullable(),
  assessmentCeilingLevelId: vine.string().uuid().optional().nullable(),
  rubricVersionId: vine.string().uuid().optional().nullable(),
  isMandatory: vine.boolean().optional(),
  importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
  weight: vine.number().min(0).optional(),
  requirementNotes: vine.string().maxLength(1000).optional().nullable(),
})

type UpdateRequirementPayload = Awaited<ReturnType<typeof updateRequirementSchema.validate>>

@inject()
export default class UpdateTaskRequirementController {
  constructor(private readonly updateTaskRequirement: UpdateTaskRequirementCommand) {}

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
        rubricVersionId: readAliasedInput(request, 'rubricVersionId', 'rubric_version_id'),
        isMandatory: readAliasedInput(request, 'isMandatory', 'is_mandatory'),
        importance: readAliasedInput(request, 'importance', 'importance'),
        weight: readAliasedInput(request, 'weight', 'weight'),
        requirementNotes: readAliasedInput(request, 'requirementNotes', 'requirement_notes'),
      })
    } catch (err) {
      throwHttpValidationError(err)
    }

    try {
      const updated = await this.updateTaskRequirement.execute(
        omitUndefined({
          requirementId,
          minimumLevelId: payload.minimumLevelId,
          targetLevelId: payload.targetLevelId,
          assessmentCeilingLevelId: payload.assessmentCeilingLevelId,
          rubricVersionId: payload.rubricVersionId,
          isMandatory: payload.isMandatory,
          importance: payload.importance,
          weight: payload.weight,
          requirementNotes: payload.requirementNotes,
        })
      )

      return { data: camelizeResponseValue(updated) }
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
