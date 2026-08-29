import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import GetOrganizationMembersApiController from '#modules/http/controllers/organization/get_organization_members_api_controller'
import GetUsersInOrganizationApiController from '#modules/http/controllers/organization/get_users_in_organization_api_controller'

function context() {
  return {
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: 'org-1',
    params: { organizationId: 'org-1' },
    request: { input: () => undefined },
  }
}

async function assertThrown(
  assert: { strictEqual: (actual: unknown, expected: unknown) => void },
  run: () => Promise<unknown>,
  expected: unknown
) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, expected)
}

test.group('HTTP identity Result boundaries', () => {
  test('organization members unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Membership access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }

    await assertThrown(
      assert,
      () => new GetOrganizationMembersApiController(query as never).handle(context() as never),
      failure
    )
  })

  test('users in organization unwraps expected query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Organization access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }

    await assertThrown(
      assert,
      () => new GetUsersInOrganizationApiController(query as never).handle(context() as never),
      failure
    )
  })
})
