import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import InviteMemberController from '#modules/organizations/controllers/invitations/invite_member_controller'

test.group('Organization invite-member Result boundary', () => {
  test('controller uses the request-aware Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Invitee not found')
    const command = {
      executeFromRequestAndWrap: () => Promise.resolve(Result.fail(failure)),
      executeFromRequest: () => Promise.reject(new Error('controller must use wrapped execution')),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const commands = {
      makeInvite: () => command,
    } as unknown as OrganizationInvitationCommandFactory
    const ctx = {
      auth: { user: { id: 'admin-1' } },
      currentOrganizationId: 'org-1',
      request: {
        input: (key: string) => (key === 'email' ? 'invitee@example.test' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { redirect: () => ({ back: () => undefined }) },
      session: { flash: () => undefined, get: () => undefined },
    }

    let thrown: unknown
    try {
      await new InviteMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
