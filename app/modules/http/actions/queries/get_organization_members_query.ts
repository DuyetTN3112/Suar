import type {
  HttpOrganizationMembersReader,
  HttpOrganizationMembersResult,
} from '#modules/http/actions/ports/outbound/http_organization_members_reader'

export default class GetOrganizationMembersQuery {
  constructor(private readonly organizations: HttpOrganizationMembersReader) {}

  execute(rawOrganizationId: string, rawQuery?: string): Promise<HttpOrganizationMembersResult> {
    return this.organizations.read(rawOrganizationId, rawQuery)
  }
}
