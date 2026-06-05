import type { HttpActionContext } from '#modules/http/public_contracts/http_action_context'
import type {
  GetProjectDetailInput,
  GetProjectDetailResult,
} from '#modules/projects/public_contracts/project_detail'

export abstract class OrganizationProjectDetailReader {
  abstract get(
    input: GetProjectDetailInput,
    execCtx: HttpActionContext
  ): Promise<GetProjectDetailResult>
}
