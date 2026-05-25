import { test } from '@japa/runner'

import type { AdminUserActionFactory } from '#modules/admin/users/actions/ports/inbound/users/admin_user_action_factory'
import ListUsersController from '#modules/admin/users/controllers/users/list_users_controller'
import ShowUserController from '#modules/admin/users/controllers/users/show_user_controller'
import SuspendUserController from '#modules/admin/users/controllers/users/suspend_user_controller'
import UpdateUserRoleController from '#modules/admin/users/controllers/users/update_user_role_controller'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'

const failureAction = () => {
  const failure = new NotFoundException('Admin user not found')
  return {
    failure,
    action: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

const context = (values: Record<string, unknown> = {}, params: Record<string, string> = {}) => ({
  auth: { user: { id: 'admin-1' } },
  currentOrganizationId: 'org-1',
  params,
  request: {
    all: () => values,
    input: (key: string) => values[key],
    qs: () => ({}),
    url: () => '/admin/users/user-1/suspend',
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: {
    redirect: () => ({ back: () => undefined }),
    status: () => ({ json: () => undefined }),
  },
  session: { flash: () => undefined, get: () => undefined },
  inertia: { render: () => undefined },
})

test.group('Admin users Result boundaries', () => {
  test('list controller preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = { makeListUsersQuery: () => action } as unknown as AdminUserActionFactory

    let thrown: unknown
    try {
      await new ListUsersController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('show controller preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = { makeGetUserDetailsQuery: () => action } as unknown as AdminUserActionFactory

    let thrown: unknown
    try {
      await new ShowUserController(actions).handle(context({}, { userId: 'user-1' }) as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('suspend controller preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = { makeSuspendUserCommand: () => action } as unknown as AdminUserActionFactory

    let thrown: unknown
    try {
      await new SuspendUserController(actions).handle(
        context({}, { userId: 'user-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('role update controller preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failureAction()
    const actions = {
      makeUpdateUserSystemRoleCommand: () => action,
    } as unknown as AdminUserActionFactory

    let thrown: unknown
    try {
      await new UpdateUserRoleController(actions).handle(
        context({ system_role: 'system_admin' }, { userId: 'user-1' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
