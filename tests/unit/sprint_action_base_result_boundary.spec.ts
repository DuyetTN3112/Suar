import { test } from '@japa/runner'

import AppException from '#modules/errors/public_contracts/application_exception'
import { BaseCommand } from '#modules/sprints/actions/base_command'

class ProbeCommand extends BaseCommand<{ readonly value: string }, string> {
  constructor(private readonly operation: () => Promise<string>) {
    super()
  }

  async execute(_input: { readonly value: string }): Promise<string> {
    return this.operation()
  }
}

test.group('Sprints action base Result boundary', () => {
  test('wraps expected application failures and rethrows unexpected failures', async ({ assert }) => {
    const expected = new AppException('sprint_probe_failure')
    const failed = await new ProbeCommand(() => Promise.reject(expected)).executeAndWrap({ value: 'x' })
    assert.isTrue(failed.isFailure())
    assert.strictEqual(failed.getError(), expected)

    const unexpected = new Error('unexpected')
    try {
      await new ProbeCommand(() => Promise.reject(unexpected)).executeAndWrap({ value: 'x' })
      assert.fail('expected the unexpected error to be rethrown')
    } catch (error) {
      assert.strictEqual(error, unexpected)
    }
  })
})
