import { BaseQuery } from '#modules/organizations/actions/queries/base_query'
import type { OrganizationActionContext } from '#modules/organizations/actions/action_context'
import type { OrganizationProjectDetailReader } from '#modules/organizations/actions/ports/outbound/projects/organization_project_detail_reader'

export interface GetOrganizationProjectDetailInput {
  projectId: string
  organizationId: string
}

type OrganizationProjectDetail = Awaited<ReturnType<OrganizationProjectDetailReader['get']>>

export default class GetOrganizationProjectDetailQuery extends BaseQuery<
  GetOrganizationProjectDetailInput,
  OrganizationProjectDetail
> {
  constructor(
    protected override execCtx: OrganizationActionContext,
    private readonly projects: OrganizationProjectDetailReader
  ) {
    super(execCtx)
  }

  async handle(input: GetOrganizationProjectDetailInput): Promise<OrganizationProjectDetail> {
    return this.execute(input)
  }

  execute(input: GetOrganizationProjectDetailInput): Promise<OrganizationProjectDetail> {
    return this.projects.get(input, this.execCtx)
  }
}
