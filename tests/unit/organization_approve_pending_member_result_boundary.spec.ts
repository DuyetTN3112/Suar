import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationMemberApprovalCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_approval_command_factory'
import ApprovePendingMemberController from '#modules/organizations/controllers/members/approve_pending_member_controller'

test.group('Organization approve-pending-member Result boundary', () => {
  test('controller unwraps the approval command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Pending member not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const commands = {
      make: () => command,
    } as unknown as OrganizationMemberApprovalCommandFactory
    const ctx = {
      auth: { user: { id: 'admin-1' } },
      currentOrganizationId: 'org-1',
      params: { userId: 'member-1' },
      request: {
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { status: () => ({ send: () => undefined }) },
    }

    let thrown: unknown
    try {
      await new ApprovePendingMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
