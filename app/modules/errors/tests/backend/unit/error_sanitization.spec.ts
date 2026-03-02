import { test } from '@japa/runner'

import {
  sanitizeErrorDetails,
  sanitizeErrorLogText,
  sanitizeErrorText,
  sanitizeRequestUrl,
} from '#modules/errors/public_contracts/error_sanitization'

test.group('Error sanitization', () => {
  test('redacts common secret formats and bounds diagnostic text', ({ assert }) => {
    const value =
      'Authorization: Bearer abc.def.ghi password=hunter2 token=secret-value ' + 'x'.repeat(3_000)
    const sanitized = sanitizeErrorText(value, 256)

    assert.notInclude(sanitized, 'abc.def.ghi')
    assert.notInclude(sanitized, 'hunter2')
    assert.notInclude(sanitized, 'secret-value')
    assert.include(sanitized, '[REDACTED]')
    assert.include(sanitized, '[TRUNCATED]')
    assert.isAtMost(sanitized.length, 256)
  })

  test('redacts provider credentials, JSON secrets, private keys, and email PII', ({ assert }) => {
    const privateKey = [
      '-----BEGIN ENCRYPTED PRIVATE KEY-----',
      'sensitive-private-key-material',
      '-----END ENCRYPTED PRIVATE KEY-----',
    ].join('\n')
    const diagnostic = [
      '{"client_secret":"oauth client secret with spaces","access_token":"oauth-access-token"}',
      'AKIAIOSFODNN7EXAMPLE',
      'ghp_123456789012345678901234567890123456',
      'glpat-1234567890abcdefghijklmn',
      'xoxb-1234567890-abcdefghijkl',
      'AIza1234567890abcdefghijklmnop',
      'sk_live_1234567890abcdefghijkl',
      'sk-1234567890abcdefghijklmnop',
      'private.user@example.com',
      privateKey,
    ].join(' ')
    const sanitized = sanitizeErrorText(diagnostic)

    assert.notInclude(sanitized, 'oauth client secret with spaces')
    assert.notInclude(sanitized, 'oauth-access-token')
    assert.notInclude(sanitized, 'AKIAIOSFODNN7EXAMPLE')
    assert.notInclude(sanitized, 'ghp_123456789012345678901234567890123456')
    assert.notInclude(sanitized, 'glpat-1234567890abcdefghijklmn')
    assert.notInclude(sanitized, 'xoxb-1234567890-abcdefghijkl')
    assert.notInclude(sanitized, 'AIza1234567890abcdefghijklmnop')
    assert.notInclude(sanitized, 'sk_live_1234567890abcdefghijkl')
    assert.notInclude(sanitized, 'sk-1234567890abcdefghijklmnop')
    assert.notInclude(sanitized, 'private.user@example.com')
    assert.notInclude(sanitized, 'sensitive-private-key-material')
    assert.include(sanitized, '"client_secret":"[REDACTED]"')
    assert.include(sanitized, '[REDACTED_EMAIL]')
    assert.include(sanitized, '[REDACTED_PRIVATE_KEY]')
  })

  test('preserves ordinary diagnostic codes that merely contain credential words', ({ assert }) => {
    const diagnostic = 'E_ACCESS_TOKEN_EXPIRED E_SESSION_NOT_FOUND SQLSTATE_23505'

    assert.equal(sanitizeErrorText(diagnostic), diagnostic)
  })

  test('cannot be crashed by hostile string conversion and removes database-unsafe NULs', ({
    assert,
  }) => {
    const hostileValue = {
      toString(): string {
        throw new Error('must not escape')
      },
    }

    assert.equal(sanitizeErrorText(hostileValue), '[UNSERIALIZABLE]')
    assert.equal(sanitizeErrorText('before\u0000after'), 'before after')
  })

  test('redacts sensitive keys, caps collections, and handles circular objects', ({ assert }) => {
    const details: Record<string, unknown> = {
      accessToken: 'raw-token',
      nested: {
        password: 'raw-password',
        safe: 'visible',
      },
      values: Array.from({ length: 75 }, (_, index) => index),
    }
    details['self'] = details

    const sanitized = sanitizeErrorDetails(details)

    assert.equal(sanitized?.['accessToken'], '[REDACTED]')
    assert.deepInclude(sanitized?.['nested'], {
      password: '[REDACTED]',
      safe: 'visible',
    })
    assert.lengthOf(sanitized?.['values'] as unknown[], 50)
    assert.equal(sanitized?.['self'], '[CIRCULAR]')
  })

  test('redacts URI credentials and prevents control-character log forging', ({ assert }) => {
    const sanitized = sanitizeErrorLogText(
      'postgres://runtime-user:database-secret@db.internal/suar\r\nforged=success\u0000'
    )

    assert.equal(sanitized, 'postgres://[REDACTED]:[REDACTED]@db.internal/suar  forged=success ')
    assert.notInclude(sanitized, 'runtime-user')
    assert.notInclude(sanitized, 'database-secret')
    assert.isFalse(
      Array.from(sanitized).some((character) => {
        const codePoint = character.codePointAt(0) ?? 0
        return codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)
      })
    )
  })

  test('removes query strings and fragments from persisted URLs', ({ assert }) => {
    assert.equal(
      sanitizeRequestUrl('/oauth/callback?code=secret&state=secret#fragment'),
      '/oauth/callback'
    )
    assert.isNull(sanitizeRequestUrl(null))
  })
})
