import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  GetProjectsListDTO,
  GetProjectsListResult,
} from '#modules/projects/public_contracts/project_listing'

export abstract class ProjectListReader {
  abstract list(
    input: GetProjectsListDTO,
    execCtx: HttpActionContext
  ): Promise<GetProjectsListResult>
}
