import type { HttpContext } from '@adonisjs/core/http'

import { mapTaskStatusDefinitionApiBody } from '../mappers/response/task_status_response_mapper.js'

import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { requireCurrentOrganizationId } from '#modules/http/public_contracts/http_execution_context'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'

export default class ShowTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = requireCurrentOrganizationId(ctx)

    const status = await taskStatusQueryRepository.findByIdAndOrgActive(
      ctx.params['taskStatusId'] as string,
      organizationId
    )

    if (!status) {
      throw NotFoundException.resource('Task status', ctx.params['taskStatusId'] as string)
    }

    return mapTaskStatusDefinitionApiBody(status)
  }
}
