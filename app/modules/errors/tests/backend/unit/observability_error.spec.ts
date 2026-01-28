import { test } from '@japa/runner'

import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'

function containsControlCharacters(value: unknown): boolean {
  if (typeof value === 'string') {
    return [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159)
    })
  }

  if (Array.isArray(value)) {
    return value.some((entry) => containsControlCharacters(entry))
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, entry]) => containsControlCharacters(key) || containsControlCharacters(entry)
    )
  }

  return false
}

test.group('Observability error serialization', () => {
  test('bounds and redacts native error diagnostics without persisting stack traces', ({
    assert,
  }) => {
    const error = new Error(
      'Authorization: Bearer secret-access-token\r\nforged=true ' + 'x'.repeat(3_000)
    )
    error.stack = 'stack contains database-password'

    const serialized = serializeObservabilityError(error)
    const persisted = JSON.stringify(serialized)

    assert.equal(serialized?.['class'], 'Error')
    assert.notInclude(persisted, 'secret-access-token')
    assert.notInclude(persisted, 'database-password')
    assert.notProperty(serialized ?? {}, 'stack')
    assert.isFalse(containsControlCharacters(serialized))
    assert.isAtMost(String(serialized?.['message']).length, 2_048)
  })

  test('sanitizes unknown object keys and recursively redacts secret fields', ({ assert }) => {
    const serialized = serializeObservabilityError({
      password: 'raw-password',
      nested: {
        apiKey: 'raw-api-key',
        reason: 'dependency failed\r\nforged=true',
      },
      ['unsafe\r\nkey']: 'visible',
    })
    const persisted = JSON.stringify(serialized)
    const details = serialized?.['details'] as Record<string, unknown>

    assert.equal(details['password'], '[REDACTED]')
    assert.deepInclude(details['nested'], {
      apiKey: '[REDACTED]',
      reason: 'dependency failed  forged=true',
    })
    assert.property(details, 'unsafe  key')
    assert.notInclude(persisted, 'raw-password')
    assert.notInclude(persisted, 'raw-api-key')
    assert.isFalse(containsControlCharacters(serialized))
  })
})
