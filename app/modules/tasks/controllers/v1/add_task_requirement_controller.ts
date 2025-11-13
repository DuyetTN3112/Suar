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

const addRequirementSchema = vine.create({
  skillId: vine.string().uuid(),
  projectSkillId: vine.string().uuid().optional().nullable(),
  sourceProjectProfessionalRoleId: vine.string().uuid().optional().nullable(),
  minimumLevelId: vine.string().uuid().optional().nullable(),
  targetLevelId: vine.string().uuid().optional().nullable(),
  assessmentCeilingLevelId: vine.string().uuid().optional().nullable(),
  isMandatory: vine.boolean().optional(),
  importance: vine.enum(['low', 'medium', 'high', 'critical']).optional(),
  weight: vine.number().min(0).optional(),
  requirementNotes: vine.string().maxLength(1000).optional().nullable(),
})

type AddRequirementPayload = Awaited<ReturnType<typeof addRequirementSchema.validate>>

export default class AddTaskRequirementController {
  async handle({ params, request, response }: HttpContext) {
    const taskId = String(params['taskId'])

    let payload: AddRequirementPayload
    try {
      payload = await addRequirementSchema.validate({
        skillId: readAliasedInput(request, 'skillId', 'skill_id'),
        projectSkillId: readAliasedInput(request, 'projectSkillId', 'project_skill_id'),
        sourceProjectProfessionalRoleId: readAliasedInput(
          request,
          'sourceProjectProfessionalRoleId',
          'source_project_professional_role_id'
        ),
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
      const requirement = await TaskSkillRequirementService.addRequirement(taskId, omitUndefined({
        skillId: payload.skillId,
        projectSkillId: payload.projectSkillId,
        sourceProjectProfessionalRoleId: payload.sourceProjectProfessionalRoleId,
        minimumLevelId: payload.minimumLevelId,
        targetLevelId: payload.targetLevelId,
        assessmentCeilingLevelId: payload.assessmentCeilingLevelId,
        isMandatory: payload.isMandatory,
        importance: payload.importance,
        weight: payload.weight,
        requirementNotes: payload.requirementNotes,
        requirementSource: 'manual' as const,
      }))

      response.created({ data: camelizeResponseValue(requirement.serialize()) })
      return
    } catch (err) {
      throwTaskRequirementBoundaryError(err)
    }
  }
}
