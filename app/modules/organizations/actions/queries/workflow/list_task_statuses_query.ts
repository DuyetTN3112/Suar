import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { ErrorMessages } from '#modules/errors/public_contracts/error_constants'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskStatusReader } from '#modules/organizations/actions/ports/outbound/workflow/organization_task_status_reader'
import { BaseQuery } from '#modules/organizations/actions/queries/base_query'

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
    execCtx: OrganizationActionContext,
    private readonly taskStatuses: OrganizationTaskStatusReader
  ) {
    super(execCtx)
  }

  async handle(_dto: ListTaskStatusesDTO): Promise<ListTaskStatusesResult> {
    const organizationId = this.getCurrentOrganizationId()
    if (!organizationId) {
      throw new BusinessLogicException(ErrorMessages.REQUIRE_ORGANIZATION)
    }

    // Fetch from repository
    const taskStatuses = await this.taskStatuses.listByOrganization(organizationId)

    return {
      taskStatuses: taskStatuses.map((status) => ({
        id: status.id,
        name: status.name,
        color: status.color,
        order: status.order,
        is_default: status.isDefault,
      })),
    }
  }
}
