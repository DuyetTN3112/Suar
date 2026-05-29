import { BaseQuery } from '#modules/cache/actions/base_query'
import type {
  CacheInvalidationOperatorPermissionReader,
  CacheInvalidationOperatorPrincipalReader,
} from '#modules/cache/actions/ports/outbound/invalidation-outbox/cache_invalidation_operator_authorization_port'

export interface AuthorizedCacheInvalidationOperator {
  id: string
  systemRole: string
}

export class AuthorizeCacheInvalidationOperatorQuery extends BaseQuery<
  { actorId: string },
  AuthorizedCacheInvalidationOperator | null
> {
  constructor(
    private readonly principals: CacheInvalidationOperatorPrincipalReader,
    private readonly permissions: CacheInvalidationOperatorPermissionReader
  ) {
    super()
  }

  async execute({ actorId }: { actorId: string }): Promise<AuthorizedCacheInvalidationOperator | null> {
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
