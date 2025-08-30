import type { OrganizationActionContext } from '#modules/organizations/actions/organization_action_context'
import { projectPublicApi, type CreateProjectDTO } from '#modules/projects/public_contracts/project_public_api'

export default class CreateCurrentOrganizationProjectCommand {
  constructor(protected execCtx: OrganizationActionContext) {}

  async handle(dto: CreateProjectDTO) {
    return projectPublicApi.createProject(dto, this.execCtx)
  }
}
