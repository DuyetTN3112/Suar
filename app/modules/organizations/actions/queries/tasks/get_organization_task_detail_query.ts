import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationTaskDetailPage } from '#modules/organizations/actions/dtos/response/tasks/organization_task_pages'
import type { OrganizationTaskDetailReader } from '#modules/organizations/actions/ports/outbound/tasks/organization_task_detail_reader'

export interface GetOrganizationTaskDetailInput {
  taskId: string
  organizationId: string
}

export default class GetOrganizationTaskDetailQuery extends BaseQuery<
  GetOrganizationTaskDetailInput,
  OrganizationTaskDetailPage
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly tasks: OrganizationTaskDetailReader
  ) {
    super(execCtx)
  }

  async handle(input: GetOrganizationTaskDetailInput): Promise<OrganizationTaskDetailPage> {
    return this.execute(input)
  }

  execute(input: GetOrganizationTaskDetailInput): Promise<OrganizationTaskDetailPage> {
    return this.tasks.read(input.taskId, input.organizationId, this.execCtx)
  }
}
