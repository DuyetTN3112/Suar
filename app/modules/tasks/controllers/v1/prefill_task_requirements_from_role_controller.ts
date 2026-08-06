import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

import { readAliasedInput } from '#modules/http/boundary/aliased_input'
import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import {
  throwHttpBoundaryError,
  throwHttpValidationError,
} from '#modules/http/boundary/http_boundary_errors'
import PrefillTaskRequirementsFromRoleCommand from '#modules/tasks/actions/commands/task-requirements/prefill_task_requirements_from_role_command'

const prefillSchema = vine.create({
  projectProfessionalRoleId: vine.string().uuid(),
})

type PrefillPayload = Awaited<ReturnType<typeof prefillSchema.validate>>

@inject()
export default class PrefillTaskRequirementsFromRoleController {
  constructor(
    private readonly prefillTaskRequirements: PrefillTaskRequirementsFromRoleCommand
  ) {}

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
      throwHttpValidationError(err)
    }

    try {
      const result = await this.prefillTaskRequirements.executeAndWrap({
        taskId,
        projectProfessionalRoleId: payload.projectProfessionalRoleId,
      }).then((outcome) => outcome.getValue())
      return { data: camelizeResponseValue(result) }
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
