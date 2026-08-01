import { test } from '@japa/runner'

import { redactSensitiveObject } from '#modules/observability/public_contracts/platform_redaction'

test.group('Unit | Platform Redaction', () => {
  test('redacts sensitive keys recursively', ({ assert }) => {
    const { value, redactionApplied } = redactSensitiveObject({
      accessToken: 'secret-token',
      nested: {
        refresh_token: 'refresh-value',
      },
      safe: 'hello',
    })

    assert.isTrue(redactionApplied)
    assert.equal(value['accessToken'], '[REDACTED]')
    assert.deepEqual(value['nested'], {
      refresh_token: '[REDACTED]',
    })
    assert.equal(value['safe'], 'hello')
  })
})
