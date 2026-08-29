import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import { BaseQuery } from '#modules/filtering/actions/base_query'

class ProbeQuery extends BaseQuery {
  execute(_input: { readonly value: string }): Promise<string> {
    return Promise.resolve('ok')
  }

  async probeFailure(error: unknown) {
    return this.wrap(() => Promise.reject(error))
  }
}

test.group('Filtering query base Result boundary', () => {
  test('wraps expected application failures and rethrows unexpected failures', async ({ assert }) => {
    const expected = new AppException('filter_probe_failure')
    const failed = await new ProbeQuery().probeFailure(expected)
    assert.isTrue(failed.isFailure())
    assert.strictEqual(failed.getError(), expected)

    const unexpected = new Error('unexpected')
    try {
      await new ProbeQuery().probeFailure(unexpected)
      assert.fail('expected the unexpected error to be rethrown')
    } catch (error) {
      assert.strictEqual(error, unexpected)
    }
  })
})
