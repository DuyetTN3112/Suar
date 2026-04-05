import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { TaskSkillRequirementService } from '#modules/tasks/actions/services/task_skill_requirement_service'
import { camelizeResponseValue } from '#modules/tasks/controllers/v1/support/camelize_response'
import { readAliasedInput } from '#modules/tasks/controllers/v1/support/read_aliased_input'
import {
  throwTaskRequirementBoundaryError,
  throwTaskRequirementValidationError,
} from '#modules/tasks/controllers/v1/support/task_requirement_api_errors'

const prefillSchema = vine.create({
  projectProfessionalRoleId: vine.string().uuid(),
})

type PrefillPayload = Awaited<ReturnType<typeof prefillSchema.validate>>

export default class PrefillTaskRequirementsFromRoleController {
  async handle({ params, request }: HttpContext) {
    const taskId = String(params['taskId'])

    let payload: PrefillPayload
    try {
      payload = await prefillSchema.validate({
        projectProfessionalRoleId: readAliasedInput(
          request,
          'projectProfessionalRoleId',
          'project_professional_role_id'
        ),
      })
    } catch (err) {
      throwTaskRequirementValidationError(err)
    }

    try {
      const result = await TaskSkillRequirementService.prefillFromProjectRole(
        taskId,
        payload.projectProfessionalRoleId
      )
      return { data: camelizeResponseValue(result) }
    } catch (err) {
      throwTaskRequirementBoundaryError(err)
    }
  }
}
