import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { UserAccountActionFactory } from '#modules/users/actions/ports/inbound/user_account_action_factory'
import UpdateProfileDetailsController from '#modules/users/controllers/profile/update_profile_details_controller'
import UpdateProfileDiscoverabilityController from '#modules/users/controllers/profile/update_profile_discoverability_controller'

const context = (values: Record<string, unknown> = {}) => ({
  auth: { user: { id: 'user-1' } },
  request: {
    all: () => values,
    input: (key: string) => values[key],
    accepts: () => 'html',
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: { redirect: () => ({ back: () => undefined }) },
  session: { flash: () => undefined, get: () => undefined },
})

const failingCommand = () => {
  const failure = new UnauthorizedException('Authentication required')
  return {
    failure,
    command: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Profile account Result boundaries', () => {
  test('update details controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = failingCommand()
    const actions = { makeUpdateDetails: () => command } as unknown as UserAccountActionFactory

    let thrown: unknown
    try {
      await new UpdateProfileDetailsController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('discoverability controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = failingCommand()
    const actions = {
      makeUpdateDiscoverability: () => command,
    } as unknown as UserAccountActionFactory

    let thrown: unknown
    try {
      await new UpdateProfileDiscoverabilityController(actions).handle(
        context({ is_searchable: true }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
