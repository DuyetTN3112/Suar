import { CacheInvalidationOperatorAuthorizationAdapter } from '#composition/adapters/cache/invalidation-outbox/cache_invalidation_operator_authorization_adapter'
import { userIdentityReader } from '#composition/users/user-application/user_application_composition'
import { AuthorizeCacheInvalidationOperatorQuery } from '#modules/cache/actions/queries/invalidation-outbox/authorize_cache_invalidation_operator_query'

const adapter = new CacheInvalidationOperatorAuthorizationAdapter(userIdentityReader)

export const authorizeCacheInvalidationOperatorQuery = new AuthorizeCacheInvalidationOperatorQuery(
  adapter,
  adapter
)
