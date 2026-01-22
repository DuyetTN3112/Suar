import { getUsersInOrganizationQuery } from '#composition/organization_directory_query_composition'
import { organizationMembershipRepository } from '#composition/organization_persistence_composition'
import type {
  HttpOrganizationMembershipSummary,
  HttpOrganizationReader,
  HttpOrganizationUser,
} from '#modules/http/actions/ports/outbound/http_organization_reader'

export class HttpOrganizationReaderAdapter implements HttpOrganizationReader {
  async listUsers(organizationId: string, excludeUserId: string): Promise<HttpOrganizationUser[]> {
    return getUsersInOrganizationQuery.execute(organizationId, excludeUserId)
  }

  async listApprovedMembershipSummaries(
    userId: string
  ): Promise<HttpOrganizationMembershipSummary[]> {
    const memberships = await organizationMembershipRepository.listSummariesByUser(userId, {
      approvedOnly: true,
    })

    return memberships.map((membership) => ({
      id: membership.id,
      name: membership.name,
      logo: membership.logo,
      orgRole: membership.org_role,
      status: membership.status,
    }))
  }
}
