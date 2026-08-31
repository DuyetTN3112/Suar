import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationInvitationCommandFactory } from '#modules/organizations/actions/ports/inbound/invitations/organization_invitation_command_factory'
import AcceptMyInvitationController from '#modules/organizations/controllers/invitations/accept_my_invitation_controller'
import RejectMyInvitationController from '#modules/organizations/controllers/invitations/reject_my_invitation_controller'

const makeContext = () => ({
  params: { organizationId: 'org-1' },
  request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
  response: { redirect: () => ({ back: () => undefined }) },
  session: { flash: () => undefined, get: () => undefined },
  auth: { user: { id: 'user-1' } },
})

test.group('Organization invitation decision Result boundaries', () => {
  test('accept controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Invitation not found')
    const commands = {
      makeAccept: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationInvitationCommandFactory

    let thrown: unknown
    try {
      await new AcceptMyInvitationController(commands).handle(makeContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('reject controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Invitation not found')
    const commands = {
      makeReject: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationInvitationCommandFactory

    let thrown: unknown
    try {
      await new RejectMyInvitationController(commands).handle(makeContext() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
