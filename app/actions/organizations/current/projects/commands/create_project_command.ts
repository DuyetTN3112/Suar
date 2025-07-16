import type { CreateProjectDTO } from '#actions/projects/dtos/request/create_project_dto'
import CreateProjectCommand from '#actions/projects/commands/create_project_command'
import type { ExecutionContext } from '#types/execution_context'

export default class CreateCurrentOrganizationProjectCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async handle(dto: CreateProjectDTO) {
    return new CreateProjectCommand(this.execCtx).handle(dto)
  }
}
