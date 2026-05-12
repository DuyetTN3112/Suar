import { taskPublicApi } from '#actions/tasks/public_api'
import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'

interface QueryOptions {
  organizationId: DatabaseId
  statusId?: DatabaseId
  priorityId?: DatabaseId
  projectId?: DatabaseId
  assignedTo?: DatabaseId
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Query: Get Organization Tasks
 *
 * Delegates to GetTasksListQuery (task module public API) with organizationId filter.
 * Permission filtering, caching, and pagination are handled internally by task module.
 *
 * @example
 * const query = new GetOrganizationTasksQuery(ctx)
 * const result = await query.execute({
 *   organizationId: 1,
 *   statusId: 2,
 *   page: 1,
 *   limit: 20
 * })
 */
export default class GetOrganizationTasksQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(options: QueryOptions) {
    return taskPublicApi.getTasksList(options, this.execCtx)
  }
}
