import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { throwHttpBoundaryError } from '#modules/http/boundary/http_boundary_errors'
import RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/remove_task_requirement_command'

@inject()
export default class RemoveTaskRequirementController {
  constructor(private readonly removeTaskRequirement: RemoveTaskRequirementCommand) {}

  async handle({ params, response }: HttpContext) {
    const requirementId = String(params['requirementId'])

    try {
      await this.removeTaskRequirement.execute(requirementId)
      response.noContent()
      return
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
