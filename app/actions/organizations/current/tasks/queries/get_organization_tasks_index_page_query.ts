import {
  taskPublicApi,
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '#actions/tasks/public_api'
import type { ExecutionContext } from '#types/execution_context'

export type OrganizationTasksIndexPageInput = GetTasksIndexPageInput
export type OrganizationTasksIndexPageResult = GetTasksIndexPageResult

export default class GetOrganizationTasksIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    input: OrganizationTasksIndexPageInput
  ): Promise<OrganizationTasksIndexPageResult> {
    return taskPublicApi.getTasksIndexPage(input, this.execCtx)
  }
}
