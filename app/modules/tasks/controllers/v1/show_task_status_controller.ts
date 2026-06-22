import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
import { taskStatusQueryRepository } from '#modules/tasks/infra/repositories/read/task_status_query_repository'

export default class ShowTaskStatusController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const status = await taskStatusQueryRepository.findByIdAndOrgActive(
      ctx.params.taskStatusId as string,
      organizationId
    )

    if (!status) {
      throw NotFoundException.resource('Task status', ctx.params.taskStatusId as string)
    }

    return mapApiV1TaskStatusResponse(status)
  }
}
