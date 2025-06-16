import { BaseQuery } from '#actions/shared/base_query'
import type { ExecutionContext } from '#types/execution_context'
import OrganizationWorkflowRepository from '#infra/organization/repositories/organization_workflow_repository'

/**
 * ListTaskStatusesQuery
 *
 * Query to list organization task statuses.
 */

export interface ListTaskStatusesDTO {
  // Empty DTO - no input needed
}

export interface ListTaskStatusesResult {
  taskStatuses: Array<{
    id: string
    name: string
    color: string
    order: number
    is_default: boolean
  }>
}

export default class ListTaskStatusesQuery extends BaseQuery<
  ListTaskStatusesDTO,
  ListTaskStatusesResult
> {
  constructor(
    execCtx: ExecutionContext,
    private workflowRepo = new OrganizationWorkflowRepository()
  ) {
    super(execCtx)
  }

  async handle(_dto: ListTaskStatusesDTO): Promise<ListTaskStatusesResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new Error('Organization context required')
    }

    // Fetch from repository
    const taskStatuses = await this.workflowRepo.listTaskStatuses(organizationId)

    return {
      taskStatuses,
    }
  }
}
