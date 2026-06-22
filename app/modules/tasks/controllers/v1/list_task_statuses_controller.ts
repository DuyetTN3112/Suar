import type { HttpContext } from '@adonisjs/core/http'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { mapApiV1TaskStatusResponse } from '#modules/http/api_v1/response_mappers'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import ListTaskStatusesQuery from '#modules/tasks/actions/queries/list_task_statuses_query'

export default class ListTaskStatusesController {
  async handle(ctx: HttpContext) {
    const organizationId = ctx.session.get('current_organization_id') as string | undefined

    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const statuses = await new ListTaskStatusesQuery().execute(organizationId)

    return {
      data: statuses.map(mapApiV1TaskStatusResponse),
    }
  }
}
