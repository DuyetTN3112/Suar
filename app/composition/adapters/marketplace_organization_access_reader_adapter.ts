import { organizationRouteAccessReader } from '#composition/organization_access_read_composition'
import type { MarketplaceOrganizationAccessReader } from '#modules/marketplace/actions/ports/outbound/marketplace_organization_access_reader'
import { canAccessOrganizationAdminShell } from '#modules/organizations/access/public_contracts/organization_access'

export class MarketplaceOrganizationAccessReaderAdapter implements MarketplaceOrganizationAccessReader {
  async canUseRecommendedTaskSort(organizationId: string, userId: string): Promise<boolean> {
    const membership = await organizationRouteAccessReader.findApprovedMembership(
      organizationId,
      userId
    )

    return canAccessOrganizationAdminShell(membership?.role ?? null).allowed
  }
}
