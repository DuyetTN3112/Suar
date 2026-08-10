import type { HttpContext } from '@adonisjs/core/http'

import { throwHttpBoundaryError } from '#modules/http/boundary/http_boundary_errors'
import type RemoveTaskRequirementCommand from '#modules/tasks/actions/commands/task-requirements/remove_task_requirement_command'
import { buildRequiredTaskRequirementRouteRequest } from '#modules/tasks/controllers/mappers/request/task-requirements/task_requirement_route_request_mapper'

export default class RemoveTaskRequirementController {
  constructor(private readonly removeTaskRequirement: RemoveTaskRequirementCommand) {}

  async handle({ params, response }: HttpContext) {
    const { requirementId } = buildRequiredTaskRequirementRouteRequest(params)

    try {
      await this.removeTaskRequirement
        .executeAndWrap(requirementId)
        .then((result) => result.getValue())
      response.noContent()
      return
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
