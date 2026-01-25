import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskStatusDefinitionApiBody } from '../mappers/response/task_status_response_mapper.js'

import { requireCurrentOrganizationId } from '#modules/http/boundary/http_execution_context'
import GetTaskStatusQuery from '#modules/tasks/actions/queries/get_task_status_query'

@inject()
export default class ShowTaskStatusController {
  constructor(private readonly getStatus: GetTaskStatusQuery) {}

  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const status = await this.getStatus.execute(
      ctx.params['taskStatusId'] as string,
      organizationId
    )

    return mapTaskStatusDefinitionApiBody(status)
  }
}
