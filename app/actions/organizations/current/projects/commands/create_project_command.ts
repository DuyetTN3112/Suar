import { projectPublicApi, type CreateProjectDTO } from '#actions/projects/public_api'
import type { ExecutionContext } from '#types/execution_context'

export default class CreateCurrentOrganizationProjectCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(dto: CreateProjectDTO) {
    return projectPublicApi.createProject(dto, this.execCtx)
  }
}
