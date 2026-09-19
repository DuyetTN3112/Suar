import { test } from '@japa/runner'

import { Result } from '#modules/errors/public_contracts/result'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { UserAdministrationQueryFactory } from '#modules/users/actions/ports/inbound/user_administration_query_factory'
import SystemUsersApiController from '#modules/users/controllers/administration/system_users_api_controller'

test.group('System users Result boundary', () => {
  test('controller preserves expected authorization query failures', async ({ assert }) => {
    const failure = new UnauthorizedException('Authentication required')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const queries = {
      makeAuthorizedUsersList: () => query,
    } as unknown as UserAdministrationQueryFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
    }

    let thrown: unknown
    try {
      await new SystemUsersApiController(queries).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
