import type { GetOrganizationsListDTO } from '../dtos/request/get_organizations_list_dto.js'

import GetAllOrganizationsQuery from './get_all_organizations_query.js'
import GetOrganizationsListQuery from './get_organizations_list_query.js'

import type { ExecutionContext } from '#types/execution_context'

type OrganizationsListResult = Awaited<ReturnType<GetOrganizationsListQuery['execute']>>

export interface OrganizationsIndexPageResult {
  organizations: OrganizationsListResult['data']
  pagination: OrganizationsListResult['pagination']
  allOrganizations: Awaited<ReturnType<GetAllOrganizationsQuery['getEnhanced']>>
}

/**
 * Query: Get Organizations Index Page Data
 *
 * Composite query that aggregates the organization list and the
 * enhanced organization directory used by the index page.
 */
export default class GetOrganizationsIndexPageQuery {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: GetOrganizationsListDTO): Promise<OrganizationsIndexPageResult> {
    const [organizationsResult, allOrganizations] = await Promise.all([
      new GetOrganizationsListQuery(this.execCtx).execute(dto),
      new GetAllOrganizationsQuery().getEnhanced(),
    ])

    return {
      organizations: organizationsResult.data,
      pagination: organizationsResult.pagination,
      allOrganizations,
    }
  }
}
