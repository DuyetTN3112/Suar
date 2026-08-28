import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_administration_command_factory'
import RemoveMemberController from '#modules/organizations/controllers/members/remove_member_controller'

test.group('Organization remove-member Result boundary', () => {
  test('controller uses the command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Member not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const commands = {
      makeRemove: () => command,
    } as unknown as OrganizationMemberAdministrationCommandFactory
    const ctx = {
      auth: { user: { id: 'admin-1' } },
      currentOrganizationId: 'org-1',
      params: { memberId: 'member-1' },
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { redirect: () => ({ back: () => undefined }) },
      session: { flash: () => undefined, get: () => undefined },
    }

    let thrown: unknown
    try {
      await new RemoveMemberController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
