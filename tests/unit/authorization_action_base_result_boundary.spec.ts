import { test } from '@japa/runner'

import { BaseCommand } from '#modules/authorization/actions/base_command'
import { BaseQuery } from '#modules/authorization/actions/base_query'
import ValidationException from '#modules/errors/public_contracts/validation_exception'

class FailingCommand extends BaseCommand<[value: string], string> {
  execute(_value: string): Promise<string> {
    return Promise.reject(new ValidationException('invalid authorization input'))
  }
}

class FailingQuery extends BaseQuery<[value: string], string> {
  execute(_value: string): Promise<string> {
    return Promise.reject(new ValidationException('invalid authorization query'))
  }
}

test.group('Authorization action base Result boundary', () => {
  test('wraps expected command and query failures', async ({ assert }) => {
    const commandResult = await new FailingCommand().executeAndWrap('value')
    const queryResult = await new FailingQuery().executeAndWrap('value')

    assert.isTrue(commandResult.isFailure())
    assert.isTrue(queryResult.isFailure())
    assert.instanceOf(commandResult.getError(), ValidationException)
    assert.instanceOf(queryResult.getError(), ValidationException)
  })

  test('rethrows unexpected failures', async ({ assert }) => {
    class UnexpectedCommand extends BaseCommand<[], void> {
      execute(): Promise<void> {
        return Promise.reject(new Error('infrastructure failure'))
      }
    }

    await assert.rejects(() => new UnexpectedCommand().executeAndWrap(), 'infrastructure failure')
  })
})
