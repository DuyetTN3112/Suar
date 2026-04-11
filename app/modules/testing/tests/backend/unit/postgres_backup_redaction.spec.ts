import { test } from '@japa/runner'

import { redactBackupValue } from '../../../../../seed/demo_data/postgres_backup.js'

test.group('PostgreSQL backup redaction', () => {
  test('replaces credential columns with NULL while preserving non-secret data', ({ assert }) => {
    assert.isNull(redactBackupValue('access_token', 'gho_sensitive_value'))
    assert.isNull(redactBackupValue('refresh_token', 'refresh_sensitive_value'))
    assert.isNull(redactBackupValue('client_secret', 'client_sensitive_value'))
    assert.isNull(redactBackupValue('password_hash', 'hash_sensitive_value'))
    assert.equal(redactBackupValue('provider_id', 'github-user-id'), 'github-user-id')
  })
})
