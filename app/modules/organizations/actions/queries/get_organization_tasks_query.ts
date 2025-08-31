import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { taskPublicApi } from '#modules/tasks/public_contracts/task_public_api'

interface QueryOptions {
  organizationId: string
  statusId?: string
  priorityId?: string
  projectId?: string
  assignedTo?: string
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
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(options: QueryOptions) {
    return taskPublicApi.getTasksList(options, this.execCtx)
  }
}
