import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationJoinRequestCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_join_request_command_factory'
import JoinOrganizationController from '#modules/organizations/controllers/invitations/join_organization_controller'

test.group('Organization join-request Result boundary', () => {
  test('controller unwraps the join command Result contract', async ({ assert }) => {
    const failure = new BusinessLogicException('Already a member')
    const commands = {
      makeRequestJoin: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationJoinRequestCommandFactory
    const ctx = {
      params: { organizationId: 'org-1' },
      auth: { user: { id: 'user-1' } },
      request: {
        accepts: () => 'json',
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      session: { flash: () => undefined, get: () => undefined },
      response: { redirect: () => ({ toRoute: () => undefined }) },
    }

    let thrown: unknown
    try {
      await new JoinOrganizationController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
