import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import type { OrganizationProjectCreateInput } from '#modules/organizations/projects/actions/dtos/request/organization_project_create_input'
import type { OrganizationProjectMutationResult } from '#modules/organizations/projects/actions/dtos/response/organization_project_mutation_result'
import type { OrganizationProjectCreator } from '#modules/organizations/projects/actions/ports/outbound/organization_project_creator'

export default class CreateOrganizationProjectCommand {
  constructor(
    private readonly context: OrganizationActionContext,
    private readonly projects: OrganizationProjectCreator
  ) {}

  execute(input: OrganizationProjectCreateInput): Promise<OrganizationProjectMutationResult> {
    return this.projects.create(input, this.context)
  }
}
