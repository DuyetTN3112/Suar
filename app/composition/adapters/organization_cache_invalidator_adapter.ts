import { taskMetadataCacheInvalidationPattern } from '#modules/cache/public_contracts/cache_contract'
import type { CacheStore } from '#modules/cache/public_contracts/cache_store'
import {
  OrganizationCacheInvalidator,
  type OrganizationMembershipCacheScope,
} from '#modules/organizations/directory/actions/ports/outbound/organization_cache_invalidator'

type PatternCacheStore = Pick<CacheStore, 'deleteByPattern'>

const unique = (values: readonly string[]): string[] => [...new Set(values)]

export class OrganizationCacheInvalidatorAdapter extends OrganizationCacheInvalidator {
  constructor(private readonly store: PatternCacheStore) {
    super()
  }

  async invalidateOrganization(organizationId: string): Promise<void> {
    await Promise.all([
      this.store.deleteByPattern(`org:detail:${organizationId}:*`),
      this.store.deleteByPattern(`org:members:org:${organizationId}:*`),
      this.store.deleteByPattern(`organization:pending_requests:org:${organizationId}`),
      this.store.deleteByPattern(taskMetadataCacheInvalidationPattern(organizationId)),
    ])
  }

  async invalidateMembership(scope: OrganizationMembershipCacheScope): Promise<void> {
    await Promise.all([
      this.invalidateOrganization(scope.organizationId),
      this.store.deleteByPattern(`tasks:grouped:org:${scope.organizationId}:*`),
      this.store.deleteByPattern(`tasks:timeline:org:${scope.organizationId}:*`),
      this.store.deleteByPattern(`task:stats:org:${scope.organizationId}:*`),
      ...unique(scope.userIds).map((userId) =>
        this.store.deleteByPattern(`orgs:list:user:${userId}:*`)
      ),
    ])
  }

  async invalidateAllOrganizationLists(): Promise<void> {
    await this.store.deleteByPattern('orgs:list:*')
  }
}
