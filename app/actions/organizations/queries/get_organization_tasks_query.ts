import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'
import GetTasksListQuery from '#actions/tasks/queries/get_tasks_list_query'
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
    const dto = new GetTasksListDTO({
      organization_id: options.organizationId,
      status: options.statusId,
      priority: options.priorityId,
      project_id: options.projectId,
      assigned_to: options.assignedTo,
      search: options.search,
      page: options.page,
      limit: options.limit,
      sort_by: options.sortBy as 'due_date' | 'created_at' | 'updated_at' | 'title' | 'priority' | undefined,
      sort_order: options.sortOrder,
    })

    return new GetTasksListQuery(this.execCtx).execute(dto)
  }
}
