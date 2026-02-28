import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTasksIndexPageInput } from './mappers/request/task_request_mapper.js'

import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import { actionContextFromHttp } from '#modules/http/adapters/http_execution_context_adapter'
import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import { makeGetTasksIndexPageQuery } from '#modules/tasks/bootstrap/task_action_factory'

const TASKS_DEFAULT_LIMIT = 10

/**
 * GET /tasks
 * Display tasks list with filters and permissions
 */
export default class ListTasksController {
  async handle(ctx: HttpContext) {
    const { request, inertia, session } = ctx
    const organizationId = session.get('current_organization_id') as string | undefined
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    const pageData = await makeGetTasksIndexPageQuery(actionContextFromHttp(ctx)).execute(
      buildGetTasksIndexPageInput(request, organizationId, TASKS_DEFAULT_LIMIT)
    )

    return await inertia.render('tasks/index', pageData)
  }
}
