import { test } from '@japa/runner'

import type { AuthSessionIdentityReader } from '#modules/auth/actions/ports/outbound/auth_session_identity_reader'
import type { AuthSessionTokenStore } from '#modules/auth/actions/ports/outbound/auth_session_token_store'
import { VerifySessionAccessTokenQuery } from '#modules/auth/actions/queries/verify_session_access_token_query'
import {
  RedisAuthSessionTokenStore,
  type RedisSessionTokenClient,
} from '#modules/auth/infra/session/redis_auth_session_token_store'
import DependencyUnavailableException from '#modules/errors/public_contracts/dependency_unavailable_exception'

const missingIdentityReader: AuthSessionIdentityReader = {
  findById: () => Promise.resolve(null),
}
const missingOrganizationMembership = {
  findApprovedRole: () => Promise.resolve(null),
}
const noSystemAccess = {
  canAccessSystemAdministration: () => Promise.resolve(false),
}

function makeQuery(store: AuthSessionTokenStore): VerifySessionAccessTokenQuery {
  return new VerifySessionAccessTokenQuery(
    store,
    missingIdentityReader,
    missingOrganizationMembership,
    noSystemAccess
  )
}

test.group('VerifySessionAccessTokenQuery failure semantics', () => {
  test('resolves the framework Redis service lazily after application boot', async ({ assert }) => {
    let resolutions = 0
    const redis: RedisSessionTokenClient = {
      multi: () => {
        throw new Error('multi must not be called')
      },
      eval: () => Promise.reject(new Error('eval must not be called')),
      get: () => Promise.resolve(null),
      del: () => Promise.reject(new Error('del must not be called')),
    }
    const store = new RedisAuthSessionTokenStore(() => {
      resolutions += 1
      return redis
    })

    assert.equal(resolutions, 0)
    assert.isNull(await store.readAccess('missing-access-token'))
    assert.equal(resolutions, 1)
  })

  test('classifies access-token Redis outages separately from an invalid token', async ({
    assert,
  }) => {
    const cause = new Error('redis password=secret connection refused')
    const redis: RedisSessionTokenClient = {
      multi: () => {
        throw new Error('multi must not be called')
      },
      eval: () => Promise.reject(new Error('eval must not be called')),
      get: () => Promise.reject(cause),
      del: () => Promise.reject(new Error('del must not be called')),
    }
    const query = makeQuery(new RedisAuthSessionTokenStore(redis))

    let failure: unknown
    try {
      await query.execute('never-log-this-token')
    } catch (error) {
      failure = error
    }

    assert.instanceOf(failure, DependencyUnavailableException)
    const dependencyFailure = failure as DependencyUnavailableException
    assert.equal(dependencyFailure.status, 503)
    assert.equal(dependencyFailure.category, 'dependency')
    assert.isTrue(dependencyFailure.retryable)
    assert.equal(dependencyFailure.cause, cause)
    assert.deepEqual(dependencyFailure.details, {
      dependency: 'redis',
      operation: 'session_access_read',
    })
    assert.notInclude(dependencyFailure.safeMessage, 'secret')
    assert.notInclude(dependencyFailure.safeMessage, 'never-log-this-token')
  })

  test('keeps a missing access token as an authentication miss', async ({ assert }) => {
    const store: AuthSessionTokenStore = {
      issue: () => Promise.reject(new Error('issue must not be called')),
      readAccess: () => Promise.resolve(null),
      readRefresh: () => Promise.resolve(null),
      rotate: () => Promise.reject(new Error('rotate must not be called')),
      revokeAccess: () => Promise.reject(new Error('revoke must not be called')),
      revokeRefresh: () => Promise.reject(new Error('revoke must not be called')),
    }

    assert.isNull(await makeQuery(store).execute('missing-token'))
  })
})
