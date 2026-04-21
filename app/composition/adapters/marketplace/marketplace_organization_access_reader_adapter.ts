import { organizationRouteAccessReader } from '#composition/organizations/access/organization_access_read_composition'
import type { MarketplaceOrganizationAccessReader } from '#modules/marketplace/actions/ports/outbound/marketplace_organization_access_reader'
import { canAccessOrganizationAdminShell } from '#modules/organizations/public_contracts/access/organization_access'

export class MarketplaceOrganizationAccessReaderAdapter implements MarketplaceOrganizationAccessReader {
  async canUseRecommendedTaskSort(organizationId: string, userId: string): Promise<boolean> {
    const membership = await organizationRouteAccessReader.findApprovedMembership(
      organizationId,
      userId
    )

    return canAccessOrganizationAdminShell(membership?.role ?? null).allowed
  }
}
