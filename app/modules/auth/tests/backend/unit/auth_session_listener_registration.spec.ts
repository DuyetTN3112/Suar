import emitter from '@adonisjs/core/services/emitter'
import { test } from '@japa/runner'

import '#composition/auth/session/auth_session_observed_composition'

test.group('Auth session listener registration', () => {
  test('has one durable evidence consumer and no legacy audit/activity login consumers', ({
    assert,
  }) => {
    assert.equal(emitter.listenerCount('auth:session:observed:v1'), 1)
    assert.equal(emitter.listenerCount('user:login'), 0)
  })
})
