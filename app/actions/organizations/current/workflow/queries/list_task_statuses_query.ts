import { BaseQuery } from '#actions/shared/base_query'
import OrganizationWorkflowRepository from '#infra/organizations/current/repositories/organization_workflow_repository'
import type { ExecutionContext } from '#types/execution_context'

/**
 * ListTaskStatusesQuery
 *
 * Query to list organization task statuses.
 */

export type ListTaskStatusesDTO = Record<string, never>

export interface ListTaskStatusesResult {
  taskStatuses: {
    id: string
    name: string
    color: string
    order: number
    is_default: boolean
  }[]
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
