import type {
  HttpOrganizationMembersReader,
  HttpOrganizationMembersResult,
} from '#modules/http/actions/ports/outbound/http_organization_members_reader'
import { mapOrganizationDetailApiBody } from '#modules/organizations/public_contracts/directory/organization_serialization'

interface OrganizationMembersCapabilityResult {
  organization: Record<string, unknown>
  members: HttpOrganizationMembersResult['members']
}

export type GetOrganizationMembersCapability = (
  rawOrganizationId: string,
  rawQuery?: string
) => Promise<OrganizationMembersCapabilityResult>

export class HttpOrganizationMembersReaderAdapter implements HttpOrganizationMembersReader {
  constructor(private readonly getMembers: GetOrganizationMembersCapability) {}

  async read(rawOrganizationId: string, rawQuery?: string): Promise<HttpOrganizationMembersResult> {
    const result = await this.getMembers(rawOrganizationId, rawQuery)

    return {
      organization: mapOrganizationDetailApiBody(result.organization).data,
      members: result.members,
    }
  }
}
