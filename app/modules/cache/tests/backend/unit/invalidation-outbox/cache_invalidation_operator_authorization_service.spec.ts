import { test } from '@japa/runner'

import type {
  CacheInvalidationOperatorPermissionReader,
  CacheInvalidationOperatorPrincipalReader,
} from '#modules/cache/actions/ports/outbound/invalidation-outbox/cache_invalidation_operator_authorization_port'
import { AuthorizeCacheInvalidationOperatorQuery } from '#modules/cache/actions/queries/invalidation-outbox/authorize_cache_invalidation_operator_query'

function serviceFor(input: { status?: string; allowed?: boolean; missing?: boolean }) {
  const principals: CacheInvalidationOperatorPrincipalReader = {
    findPrincipal(actorId) {
      return Promise.resolve(
        input.missing
          ? null
          : {
              id: actorId,
              systemRole: 'system_admin',
              status: input.status ?? 'active',
            }
      )
    },
  }
  const permissions: CacheInvalidationOperatorPermissionReader = {
    canManageSystemSettings() {
      return Promise.resolve(input.allowed ?? true)
    },
  }
  return new AuthorizeCacheInvalidationOperatorQuery(principals, permissions)
}

test.group('AuthorizeCacheInvalidationOperatorQuery', () => {
  test('returns a minimal authorized operator fact', async ({ assert }) => {
    const actorId = '11111111-1111-4111-8111-111111111111'
    assert.deepEqual(await serviceFor({}).execute({ actorId }), {
      id: actorId,
      systemRole: 'system_admin',
    })
  })

  test('fails closed for missing, inactive, or unauthorized principals', async ({ assert }) => {
    assert.isNull(await serviceFor({ missing: true }).execute({ actorId: 'missing' }))
    assert.isNull(await serviceFor({ status: 'suspended' }).execute({ actorId: 'suspended' }))
    assert.isNull(await serviceFor({ allowed: false }).execute({ actorId: 'unauthorized' }))
  })
})
