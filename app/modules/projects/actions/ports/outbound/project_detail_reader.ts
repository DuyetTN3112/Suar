import type { ProjectActionContext } from '#modules/projects/actions/project_action_context'
import type {
  GetProjectDetailInput,
  GetProjectDetailResult,
} from '#modules/projects/public_contracts/project_detail'

export abstract class ProjectDetailReader {
  abstract get(
    input: GetProjectDetailInput,
    execCtx: ProjectActionContext
  ): Promise<GetProjectDetailResult>
}
