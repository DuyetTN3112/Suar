import GetTasksIndexPageQuery, {
  type GetTasksIndexPageInput,
  type GetTasksIndexPageResult,
} from '#actions/tasks/queries/get_tasks_index_page_query'
import type { ExecutionContext } from '#types/execution_context'

export type OrganizationTasksIndexPageInput = GetTasksIndexPageInput
export type OrganizationTasksIndexPageResult = GetTasksIndexPageResult

export default class GetOrganizationTasksIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(
    input: OrganizationTasksIndexPageInput
  ): Promise<OrganizationTasksIndexPageResult> {
    return new GetTasksIndexPageQuery(this.execCtx).execute(input)
  }
}
