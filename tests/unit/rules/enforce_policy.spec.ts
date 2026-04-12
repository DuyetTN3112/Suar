import { test } from '@japa/runner'

import { enforcePolicy } from '#actions/shared/enforce_policy'
import { PolicyResult } from '#domain/shared/policy_result'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

test.group('enforcePolicy', () => {
  test('allowed results are a no-op', ({ assert }) => {
    assert.doesNotThrow(() => {
      enforcePolicy(PolicyResult.allow())
    })
  })

  test('FORBIDDEN results become ForbiddenException with the original reason', ({ assert }) => {
    try {
      enforcePolicy(PolicyResult.deny('No access', 'FORBIDDEN'))
      assert.fail('Expected a forbidden exception')
    } catch (error) {
      assert.instanceOf(error, ForbiddenException)
      assert.equal((error as ForbiddenException).status, 403)
      assert.equal((error as ForbiddenException).message, 'No access')
    }
  })

  test('BUSINESS_RULE and INVALID_STATE both become BusinessLogicException', ({ assert }) => {
    for (const code of ['BUSINESS_RULE', 'INVALID_STATE'] as const) {
      try {
        enforcePolicy(PolicyResult.deny(`Denied as ${code}`, code))
        assert.fail(`Expected ${code} to throw`)
      } catch (error) {
        assert.instanceOf(error, BusinessLogicException)
        assert.equal((error as BusinessLogicException).status, 400)
        assert.equal((error as BusinessLogicException).message, `Denied as ${code}`)
      }
    }
  })
})
