import { test } from '@japa/runner'

import { AuthMethod, OAuthProvider } from '#modules/users/constants/user_constants'

test.group('Auth domain invariants', () => {
  test('supported auth methods stay aligned with OAuth providers', ({ assert }) => {
    assert.deepEqual(Object.values(AuthMethod).sort(), ['github', 'google'])
    assert.deepEqual(Object.values(OAuthProvider).sort(), Object.values(AuthMethod).sort())
  })
})
