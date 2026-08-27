import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationMembershipCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_membership_command_factory'
import BulkAddMembersController from '#modules/organizations/controllers/members/bulk_add_members_controller'

test.group('Organization bulk-add-members Result boundary', () => {
  test('controller unwraps the bulk command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Organization not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const commands = {
      makeBulkAdd: () => command,
    } as unknown as OrganizationMembershipCommandFactory
    const ctx = {
      auth: { user: { id: 'admin-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: () => ['member-1'],
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { redirect: () => ({ back: () => undefined }) },
      session: { flash: () => undefined, get: () => undefined },
    }

    let thrown: unknown
    try {
      await new BulkAddMembersController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
