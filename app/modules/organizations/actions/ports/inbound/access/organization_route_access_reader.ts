import type { OrganizationTransaction } from '#modules/organizations/actions/ports/outbound/organization_transaction'
import type { MembershipContext } from '#modules/organizations/domain/access/org_types'

/**
 * Minimal application contract required by organization-aware HTTP middleware.
 *
 * This is an abstract class so Adonis can use it as a runtime injection token.
 */
export abstract class OrganizationRouteAccessReader {
  abstract findApprovedMembership(
    organizationId: string,
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<MembershipContext>

  abstract findFirstApprovedMembership(
    userId: string,
    transaction?: OrganizationTransaction
  ): Promise<MembershipContext>

  abstract checkPermission(
    userId: string,
    organizationId: string,
    permission: string,
    transaction?: OrganizationTransaction
  ): Promise<boolean>
}
