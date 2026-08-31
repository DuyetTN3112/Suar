import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import ApproveJoinRequestController from '#modules/organizations/controllers/invitations/approve_join_request_controller'

test.group('Organization process join-request Result boundary', () => {
  test('controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Join request not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const commands = {
      makeProcessJoinRequest: () => command,
    } as unknown as OrganizationInvitationCommandFactory
    const ctx = {
      auth: { user: { id: 'admin-1' } },
      currentOrganizationId: 'org-1',
      params: { joinRequestId: 'requester-1' },
      request: {
        input: (key: string) => (key === 'action' ? 'approve' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { redirect: () => ({ back: () => undefined }) },
      session: { flash: () => undefined, get: () => undefined },
    }

    let thrown: unknown
    try {
      await new ApproveJoinRequestController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
