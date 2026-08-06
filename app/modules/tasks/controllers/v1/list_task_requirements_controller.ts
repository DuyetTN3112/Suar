import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { camelizeResponseValue } from '#modules/http/boundary/camelize_response'
import ListTaskRequirementProjectionsQuery from '#modules/tasks/actions/queries/task-requirements/list_task_requirement_projections_query'

@inject()
export default class ListTaskRequirementsController {
  constructor(private readonly listRequirements: ListTaskRequirementProjectionsQuery) {}

  async handle({ params }: HttpContext) {
    const taskId = String(params['taskId'])

    const result = await this.listRequirements.executeAndWrap(taskId)
    return { data: camelizeResponseValue(result.getValue()) }
  }
}
