import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import { throwHttpBoundaryError } from '#modules/http/boundary/http_boundary_errors'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/list_task_requirement_projections_query'

@inject()
export default class ListTaskRequirementsController {
  constructor(private readonly listRequirements: ListTaskRequirementProjectionsQuery) {}

  async handle({ params }: HttpContext) {
    const taskId = String(params['taskId'])

    try {
      const requirements = await this.listRequirements.handle(taskId)

      return {
        data: camelizeResponseValue(requirements),
      }
    } catch (err) {
      throwHttpBoundaryError(err)
    }
  }
}
