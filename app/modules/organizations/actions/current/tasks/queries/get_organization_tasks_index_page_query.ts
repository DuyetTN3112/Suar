import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import {
  taskPublicApi,
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '#modules/tasks/public_contracts/task_public_api'

export type OrganizationTasksIndexPageInput = GetTasksIndexPageInput
export type OrganizationTasksIndexPageResult = GetTasksIndexPageResult

export default class GetOrganizationTasksIndexPageQuery {
  constructor(protected execCtx: OrganizationActionContext) {}

  async execute(
    input: OrganizationTasksIndexPageInput
  ): Promise<OrganizationTasksIndexPageResult> {
    return taskPublicApi.getTasksIndexPage(input, this.execCtx)
  }
}
