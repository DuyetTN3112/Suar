import type {
  HttpOrganizationReader,
  HttpOrganizationUser,
} from '#modules/http/actions/ports/outbound/http_organization_reader'

export default class GetUsersInOrganizationQuery {
  constructor(private readonly organizations: HttpOrganizationReader) {}

  execute(organizationId: string, excludeUserId: string): Promise<HttpOrganizationUser[]> {
    return this.organizations.listUsers(organizationId, excludeUserId)
  }
}
