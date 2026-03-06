import GetAllOrganizationsQuery from '#modules/organizations/actions/queries/get_all_organizations_query'

export type OrganizationDirectoryItem = Awaited<
  ReturnType<GetAllOrganizationsQuery['searchBasicList']>
>[number]

export type OrganizationMembershipDirectoryPage = Awaited<
  ReturnType<GetAllOrganizationsQuery['getWithMembershipStatusPage']>
>

export async function searchOrganizationsBasicList(
  query: string,
  limit = 25
): Promise<OrganizationDirectoryItem[]> {
  return new GetAllOrganizationsQuery().searchBasicList(query, limit)
}

export async function getOrganizationsMembershipDirectoryPage(input: {
  userId: string
  page: number
  perPage: number
  search?: string
}): Promise<OrganizationMembershipDirectoryPage> {
  return new GetAllOrganizationsQuery().getWithMembershipStatusPage(input)
}
