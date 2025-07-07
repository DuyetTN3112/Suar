import type { HttpContext } from '@adonisjs/core/http'

import { buildGetTasksIndexPageInput } from './mappers/request/task_request_mapper.js'

import GetTasksIndexPageQuery from '#actions/tasks/queries/get_tasks_index_page_query'
import { ErrorMessages } from '#constants/error_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import { ExecutionContext } from '#types/execution_context'


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

    const pageData = await new GetTasksIndexPageQuery(ExecutionContext.fromHttp(ctx)).execute(
      buildGetTasksIndexPageInput(request, organizationId, TASKS_DEFAULT_LIMIT)
    )

    return await inertia.render('tasks/index', pageData)
  }
}
