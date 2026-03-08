import { test } from '@japa/runner'
import type { PolicyResult as PolicyResultType } from '#actions/shared/rules/policy_result'
import { PolicyResult } from '#actions/shared/rules/policy_result'

/**
 * Tests for PolicyResult — Pure discriminated union factory.
 * No database required.
 */

// ============================================================================
// PolicyResult.allow()
// ============================================================================

test.group('PolicyResult.allow', () => {
  test('returns allowed: true', ({ assert }) => {
    const result = PolicyResult.allow()
    assert.isTrue(result.allowed)
  })

  test('has no reason property', ({ assert }) => {
    const result = PolicyResult.allow()
    assert.notProperty(result, 'reason')
  })

  test('has no code property', ({ assert }) => {
    const result = PolicyResult.allow()
    assert.notProperty(result, 'code')
  })

  test('each call returns a new object', ({ assert }) => {
    const a = PolicyResult.allow()
    const b = PolicyResult.allow()
    assert.notStrictEqual(a, b)
  })
})

// ============================================================================
// PolicyResult.deny()
// ============================================================================

test.group('PolicyResult.deny', () => {
  test('returns allowed: false', ({ assert }) => {
    const result = PolicyResult.deny('some reason')
    assert.isFalse(result.allowed)
  })

  test('includes the reason message', ({ assert }) => {
    const result = PolicyResult.deny('Not permitted')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.reason, 'Not permitted')
    }
  })

  test('defaults code to FORBIDDEN', ({ assert }) => {
    const result = PolicyResult.deny('No access')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'FORBIDDEN')
    }
  })

  test('accepts BUSINESS_RULE code', ({ assert }) => {
    const result = PolicyResult.deny('Rule violation', 'BUSINESS_RULE')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('accepts INVALID_STATE code', ({ assert }) => {
    const result = PolicyResult.deny('Bad state', 'INVALID_STATE')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'INVALID_STATE')
    }
  })

  test('accepts FORBIDDEN code explicitly', ({ assert }) => {
    const result = PolicyResult.deny('Forbidden', 'FORBIDDEN')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'FORBIDDEN')
    }
  })

  test('preserves Vietnamese reason message', ({ assert }) => {
    const result = PolicyResult.deny('Không có quyền xóa task', 'FORBIDDEN')
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.reason, 'Không có quyền xóa task')
    }
  })

  test('each call returns a new object', ({ assert }) => {
    const a = PolicyResult.deny('reason', 'FORBIDDEN')
    const b = PolicyResult.deny('reason', 'FORBIDDEN')
    assert.notStrictEqual(a, b)
  })
})

// ============================================================================
// Type discrimination (allowed acts as discriminant)
// ============================================================================

test.group('PolicyResult — type discrimination', () => {
  test('allowed result narrows to { allowed: true }', ({ assert }) => {
    const result: PolicyResultType = PolicyResult.allow()
    if (result.allowed) {
      // TypeScript narrows: no reason/code properties
      assert.isTrue(result.allowed)
    } else {
      assert.fail('Expected allowed to be true')
    }
  })

  test('denied result narrows to { allowed: false, reason, code }', ({ assert }) => {
    const result: PolicyResultType = PolicyResult.deny('test', 'BUSINESS_RULE')
    if (!result.allowed) {
      assert.equal(result.reason, 'test')
      assert.equal(result.code, 'BUSINESS_RULE')
    } else {
      assert.fail('Expected allowed to be false')
    }
  })
})
