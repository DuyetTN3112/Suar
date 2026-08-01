import type {
  CacheInvalidationOperatorPermissionReader,
  CacheInvalidationOperatorPrincipalReader,
} from '#modules/cache/actions/ports/outbound/cache_invalidation_operator_authorization_port'

export interface AuthorizedCacheInvalidationOperator {
  id: string
  systemRole: string
}

export class AuthorizeCacheInvalidationOperatorQuery {
  constructor(
    private readonly principals: CacheInvalidationOperatorPrincipalReader,
    private readonly permissions: CacheInvalidationOperatorPermissionReader
  ) {}

  async execute(actorId: string): Promise<AuthorizedCacheInvalidationOperator | null> {
    const actor = await this.principals.findPrincipal(actorId)
    if (
      !actor ||
      actor.status !== 'active' ||
      !(await this.permissions.canManageSystemSettings(actor.systemRole))
    ) {
      return null
    }

    return { id: actor.id, systemRole: actor.systemRole }
  }
}
