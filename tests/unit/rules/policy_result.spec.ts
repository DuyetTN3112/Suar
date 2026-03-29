import { test } from '@japa/runner'
import { PolicyResult } from '#domain/shared/policy_result'

test.group('PolicyResult', () => {
  test('allow returns a fresh allow-only result object', ({ assert }) => {
    const first = PolicyResult.allow()
    const second = PolicyResult.allow()

    assert.deepEqual(first, { allowed: true })
    assert.notProperty(first, 'reason')
    assert.notProperty(first, 'code')
    assert.notStrictEqual(first, second)
  })

  test('deny preserves reason, defaults FORBIDDEN, and accepts explicit deny codes', ({
    assert,
  }) => {
    const defaultDeny = PolicyResult.deny('No access')
    const explicitDenies = [
      PolicyResult.deny('Rule violation', 'BUSINESS_RULE'),
      PolicyResult.deny('Bad transition', 'INVALID_STATE'),
    ]

    assert.deepEqual(defaultDeny, {
      allowed: false,
      reason: 'No access',
      code: 'FORBIDDEN',
    })

    assert.deepEqual(explicitDenies, [
      {
        allowed: false,
        reason: 'Rule violation',
        code: 'BUSINESS_RULE',
      },
      {
        allowed: false,
        reason: 'Bad transition',
        code: 'INVALID_STATE',
      },
    ])
  })
})
