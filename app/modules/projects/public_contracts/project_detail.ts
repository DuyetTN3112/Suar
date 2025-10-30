import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import GetProjectDetailQuery, {
  type GetProjectDetailResult,
} from '#modules/projects/actions/queries/get_project_detail_query'

export interface GetProjectDetailInput {
  projectId: string
  organizationId?: string
}

export type { GetProjectDetailResult }

export async function getProjectDetail(
  input: GetProjectDetailInput,
  execCtx: HttpActionContext
): Promise<GetProjectDetailResult> {
  return new GetProjectDetailQuery(execCtx).handle(input)
}
