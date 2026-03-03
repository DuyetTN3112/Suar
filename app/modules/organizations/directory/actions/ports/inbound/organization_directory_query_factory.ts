import type GetAllOrganizationsQuery from '#modules/organizations/directory/actions/query/get_all_organizations_query'

/**
 * Inbound construction contract for the organization directory.
 */
export abstract class OrganizationDirectoryQueryFactory {
  abstract makeAllOrganizationsQuery(): GetAllOrganizationsQuery
}
