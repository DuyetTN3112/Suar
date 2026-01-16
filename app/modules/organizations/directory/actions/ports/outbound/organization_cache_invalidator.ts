export interface OrganizationMembershipCacheScope {
  organizationId: string
  userIds: readonly string[]
}

/**
 * Outbound cache-maintenance port.
 *
 * Commands and event handlers decide when invalidation happens. Implementations
 * own cache-key mechanics and the cache backend interaction.
 */
export abstract class OrganizationCacheInvalidator {
  abstract invalidateOrganization(organizationId: string): Promise<void>
  abstract invalidateMembership(scope: OrganizationMembershipCacheScope): Promise<void>
  abstract invalidateAllOrganizationLists(): Promise<void>
}
