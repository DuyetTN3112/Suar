import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import { AuthorizationOrganizationAccessReader } from '#modules/authorization/actions/ports/outbound/authorization_organization_access_reader'
import type { AuthorizationTransaction } from '#modules/authorization/actions/ports/outbound/authorization_transaction'

export class OrganizationsAuthorizationAccessReaderAdapter extends AuthorizationOrganizationAccessReader {
  checkPermission(
    userId: string,
    organizationId: string,
    permission: string,
    trx?: AuthorizationTransaction
  ): Promise<boolean> {
    return organizationRouteAccessReader.checkPermission(
      userId,
      organizationId,
      permission,
      trx
    )
  }

  async getApprovedRole(organizationId: string, userId: string): Promise<string | null> {
    const membership = await organizationRouteAccessReader.findApprovedMembership(
      organizationId,
      userId
    )
    return membership?.role ?? null
  }
}
