import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationMemberAdministrationCommandFactory } from '#modules/organizations/actions/ports/inbound/members/organization_member_administration_command_factory'
import UpdateMemberRoleController from '#modules/organizations/controllers/members/update_member_role_controller'

test.group('Organization update-member-role Result boundary', () => {
  test('controller uses the request-aware Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Member not found')
    const command = {
      executeFromRequestAndWrap: () => Promise.resolve(Result.fail(failure)),
      executeFromRequest: () => Promise.reject(new Error('controller must use wrapped execution')),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const commands = {
      makeUpdateRole: () => command,
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
      await new UpdateMemberRoleController(commands).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
