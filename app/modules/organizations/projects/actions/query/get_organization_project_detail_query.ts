import type { OrganizationActionContext } from '#modules/organizations/projects/actions/action_context'
import type { OrganizationProjectDetailReader } from '#modules/organizations/projects/actions/ports/outbound/organization_project_detail_reader'

export interface GetOrganizationProjectDetailInput {
  projectId: string
  organizationId: string
}

export default class GetOrganizationProjectDetailQuery {
  constructor(
    private readonly context: OrganizationActionContext,
    private readonly projects: OrganizationProjectDetailReader
  ) {}

  execute(input: GetOrganizationProjectDetailInput) {
    return this.projects.get(input, this.context)
  }
}
