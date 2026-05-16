import type { HttpContext } from '@adonisjs/core/http'
import { test } from '@japa/runner'

import {
  buildIssueSessionTokenRequest,
  buildRefreshSessionTokenRequest,
} from '#modules/auth/controllers/mappers/request/session-management/session_token_request_mapper'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

function requestOf(values: Record<string, unknown>): Pick<HttpContext['request'], 'input'> {
  return {
    input(key: string) {
      return values[key]
    },
  }
}


test.group('', () => {
  test('maps the issue organization from session with user fallback', ({ assert }) => {
    assert.deepEqual(buildIssueSessionTokenRequest(' session-org ', 'user-org'), {
      organizationId: 'session-org',
    })
    assert.deepEqual(buildIssueSessionTokenRequest(undefined, ' user-org '), {
      organizationId: 'user-org',
    })
    assert.deepEqual(buildIssueSessionTokenRequest(null, null), { organizationId: null })
  })

  test('preserves refresh aliases and normalizes values', ({ assert }) => {
    assert.deepEqual(
      buildRefreshSessionTokenRequest(
        requestOf({ refresh_token: ' refresh-token ', organization_id: ' org-1 ' })
      ),
      { refreshToken: 'refresh-token', organizationId: 'org-1' }
    )
    assert.deepEqual(buildRefreshSessionTokenRequest(requestOf({ refreshToken: 'token' })), {
      refreshToken: 'token',
    })
  })

  test('rejects missing or malformed refresh input before command execution', ({ assert }) => {
    try {
      buildRefreshSessionTokenRequest(requestOf({}))
      assert.fail('Expected missing refresh token to be rejected')
    } catch (error) {
      assert.instanceOf(error, ValidationException)
      assert.equal((error as ValidationException).issues[0]?.path, 'refreshToken')
      assert.equal((error as ValidationException).message, 'Refresh token is required')
    }

    assert.throws(
      () => buildRefreshSessionTokenRequest(requestOf({ refresh_token: 42 })),
      ValidationException
    )
    assert.throws(
      () => buildIssueSessionTokenRequest(42, 'org-1'),
      ValidationException
    )
  })

})
