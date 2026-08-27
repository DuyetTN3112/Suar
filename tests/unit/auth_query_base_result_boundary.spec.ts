import { test } from '@japa/runner'

import { BaseQuery } from '#modules/auth/actions/base_query'
import AppException from '#modules/errors/public_contracts/application_exception'

class ProbeQuery extends BaseQuery {
  async probe(error: unknown) {
    return this.wrap(() => Promise.reject(error))
  }
}

test.group('Auth query base Result boundary', () => {
  test('wraps expected application failures and rethrows unexpected failures', async ({ assert }) => {
    const expected = new AppException('auth_probe_failure')
    const failed = await new ProbeQuery().probe(expected)
    assert.isTrue(failed.isFailure())
    assert.strictEqual(failed.getError(), expected)

    const unexpected = new Error('unexpected')
    try {
      await new ProbeQuery().probe(unexpected)
      assert.fail('expected the unexpected error to be rethrown')
    } catch (error) {
      assert.strictEqual(error, unexpected)
    }
  })
})
