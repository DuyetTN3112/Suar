import { test } from '@japa/runner'

import { isPolicyViolationException } from '#modules/authorization/exceptions/policy_violation_exception'
import { enforcePolicy } from '#modules/authorization/public_contracts/permission_checker'
import { PolicyResult } from '#modules/authorization/public_contracts/policy_result'

test.group('enforcePolicy', () => {
  test('allowed results are a no-op', ({ assert }) => {
    assert.doesNotThrow(() => {
      enforcePolicy(PolicyResult.allow())
    })
  })

  test('FORBIDDEN results become a policy violation with the original reason', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('No access', 'FORBIDDEN'))
      assert.fail('Expected a policy violation exception')
    } catch (error) {
      assert.isTrue(isPolicyViolationException(error))
      if (!isPolicyViolationException(error)) throw error
      assert.equal(error.policyCode, 'FORBIDDEN')
      assert.equal(error.reason, 'No access')
    }
  })

  test('BUSINESS_RULE and INVALID_STATE both become policy violations', ({ assert }) => {
    for (const code of ['BUSINESS_RULE', 'INVALID_STATE'] as const) {
      try {
        enforcePolicy(PolicyResult.deny(`Denied as ${code}`, code))
        assert.fail(`Expected ${code} to throw`)
      } catch (error) {
        assert.isTrue(isPolicyViolationException(error))
        if (!isPolicyViolationException(error)) throw error
        assert.equal(error.policyCode, code)
        assert.equal(error.reason, `Denied as ${code}`)
      }
    }
  })
})
