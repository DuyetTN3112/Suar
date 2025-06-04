import { test } from '@japa/runner'
import { enforcePolicy } from '#actions/shared/rules/enforce_policy'
import { PolicyResult } from '#actions/shared/rules/policy_result'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Tests for enforcePolicy — Bridge from PolicyResult to framework exceptions.
 * No database required.
 */

// ============================================================================
// enforcePolicy — allowed results
// ============================================================================

test.group('enforcePolicy | allowed', () => {
  test('does not throw for allowed result', ({ assert }) => {
    assert.doesNotThrow(() => {
      enforcePolicy(PolicyResult.allow())
    })
  })

  test('returns void for allowed result', ({ assert }) => {
    const result = enforcePolicy(PolicyResult.allow())
    assert.isUndefined(result)
  })
})

// ============================================================================
// enforcePolicy — denied results throw correct exception type
// ============================================================================

test.group('enforcePolicy | denied — FORBIDDEN', () => {
  test('throws ForbiddenException for FORBIDDEN code', ({ assert }) => {
    assert.throws(() => {
      enforcePolicy(PolicyResult.deny('No access', 'FORBIDDEN'))
    }, 'No access')
  })

  test('thrown exception is instance of ForbiddenException', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('No access', 'FORBIDDEN'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.instanceOf(err, ForbiddenException)
    }
  })

  test('thrown ForbiddenException has status 403', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('No access', 'FORBIDDEN'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.equal((err as ForbiddenException).status, 403)
    }
  })

  test('preserves the reason message', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('Bạn không có quyền', 'FORBIDDEN'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.equal((err as ForbiddenException).message, 'Bạn không có quyền')
    }
  })
})

test.group('enforcePolicy | denied — BUSINESS_RULE', () => {
  test('throws BusinessLogicException for BUSINESS_RULE code', ({ assert }) => {
    assert.throws(() => {
      enforcePolicy(PolicyResult.deny('Rule violation', 'BUSINESS_RULE'))
    }, 'Rule violation')
  })

  test('thrown exception is instance of BusinessLogicException', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('Cannot do this', 'BUSINESS_RULE'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.instanceOf(err, BusinessLogicException)
    }
  })

  test('thrown BusinessLogicException has status 400', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('Violation', 'BUSINESS_RULE'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.equal((err as BusinessLogicException).status, 400)
    }
  })
})

test.group('enforcePolicy | denied — INVALID_STATE', () => {
  test('throws BusinessLogicException for INVALID_STATE code', ({ assert }) => {
    assert.throws(() => {
      enforcePolicy(PolicyResult.deny('Bad transition', 'INVALID_STATE'))
    }, 'Bad transition')
  })

  test('thrown exception is instance of BusinessLogicException', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('Invalid state', 'INVALID_STATE'))
      assert.fail('Expected exception')
    } catch (err) {
      assert.instanceOf(err, BusinessLogicException)
    }
  })

  test('INVALID_STATE maps to same exception type as BUSINESS_RULE', ({ assert }) => {
    let businessRuleError: Error | null = null
    let invalidStateError: Error | null = null

    try {
      enforcePolicy(PolicyResult.deny('test', 'BUSINESS_RULE'))
    } catch (err) {
      businessRuleError = err as Error
    }

    try {
      enforcePolicy(PolicyResult.deny('test', 'INVALID_STATE'))
    } catch (err) {
      invalidStateError = err as Error
    }

    assert.isNotNull(businessRuleError)
    assert.isNotNull(invalidStateError)
    assert.equal(businessRuleError!.constructor.name, invalidStateError!.constructor.name)
  })
})

// ============================================================================
// enforcePolicy — integration with PolicyResult factory
// ============================================================================

test.group('enforcePolicy | integration with policy functions', () => {
  test('end-to-end: allow() → no throw', ({ assert }) => {
    const result = PolicyResult.allow()
    assert.doesNotThrow(() => {
      enforcePolicy(result)
    })
  })

  test('end-to-end: deny(FORBIDDEN) → ForbiddenException', ({ assert }) => {
    const result = PolicyResult.deny('Access denied')
    try {
      enforcePolicy(result)
      assert.fail('Expected exception')
    } catch (err) {
      assert.instanceOf(err, ForbiddenException)
    }
  })

  test('end-to-end: deny(BUSINESS_RULE) → BusinessLogicException', ({ assert }) => {
    const result = PolicyResult.deny('Cannot self-assign', 'BUSINESS_RULE')
    try {
      enforcePolicy(result)
      assert.fail('Expected exception')
    } catch (err) {
      assert.instanceOf(err, BusinessLogicException)
    }
  })
})
