import { GetOrganizationDetailDTO } from '../dtos/request/get_organization_detail_dto.js'

import GetOrganizationDetailQuery from './get_organization_detail_query.js'
import GetOrganizationShowDataQuery from './get_organization_show_data_query.js'

import type { DatabaseId } from '#types/database'
import type { ExecutionContext } from '#types/execution_context'


export interface OrganizationShowPageResult {
  organization: Awaited<ReturnType<GetOrganizationDetailQuery['execute']>>
  members: {
    id: DatabaseId
    username: string
    email: string
    org_role: string
    role_name: string
  }[]
  userRole: string
}

/**
 * Composite Query: Get Organization Show Page Data
 *
 * Aggregates all data needed to render the organization show page
 * by running GetOrganizationDetailQuery and GetOrganizationShowDataQuery in parallel.
 */
export default class GetOrganizationShowPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(organizationId: string, userId: DatabaseId): Promise<OrganizationShowPageResult> {
    const dto = new GetOrganizationDetailDTO(organizationId, true, false, false)

    const [organization, showData] = await Promise.all([
      new GetOrganizationDetailQuery(this.execCtx).execute(dto),
      new GetOrganizationShowDataQuery().execute(organizationId, userId),
    ])

    return {
      organization,
      members: showData.members,
      userRole: showData.userRole,
    }
  }
}
