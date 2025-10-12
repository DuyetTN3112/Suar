import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import GetProjectsListQuery, {
  type GetProjectsListDTO,
  type GetProjectsListResult,
} from '#modules/projects/actions/queries/get_projects_list_query'

export type { GetProjectsListDTO, GetProjectsListResult }

export async function listProjects(
  input: GetProjectsListDTO,
  execCtx: HttpActionContext
): Promise<GetProjectsListResult> {
  return new GetProjectsListQuery(execCtx).handle(input)
}
