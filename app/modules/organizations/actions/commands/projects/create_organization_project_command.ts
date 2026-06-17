import { BaseCommand } from '#modules/organizations/actions/commands/base_command'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationProjectCreateInput } from '#modules/organizations/actions/dtos/request/projects/organization_project_create_input'
import type { OrganizationProjectMutationResult } from '#modules/organizations/actions/dtos/response/projects/organization_project_mutation_result'
import type { OrganizationProjectCreator } from '#modules/organizations/actions/ports/outbound/projects/organization_project_creator'

export default class CreateOrganizationProjectCommand extends BaseCommand<
  OrganizationProjectCreateInput,
  OrganizationProjectMutationResult
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly projects: OrganizationProjectCreator
  ) {
    super(execCtx)
  }

  async handle(input: OrganizationProjectCreateInput): Promise<OrganizationProjectMutationResult> {
    return this.execute(input)
  }

  execute(input: OrganizationProjectCreateInput): Promise<OrganizationProjectMutationResult> {
    return this.projects.create(input, this.execCtx)
  }
}
