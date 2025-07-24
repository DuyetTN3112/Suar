import GetOrganizationMembersApiQuery from '#actions/organizations/queries/get_organization_members_api_query'

export default class GetHttpOrganizationMembersApiQuery {
  async execute(rawId: string) {
    return new GetOrganizationMembersApiQuery().execute(rawId)
  }
}
