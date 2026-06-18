import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import SwitchOrganizationController from '#modules/organizations/controllers/access/switch_organization_controller'

test.group('Organization switch Result boundary', () => {
  test('controller unwraps the switch command Result contract', async ({ assert }) => {
    const failure = new NotFoundException('Organization not found')
    const actions = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationSwitchCommandFactory
    const ctx = {
      request: {
        input: (key: string) => (key === 'organizationId' ? 'org-2' : undefined),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      auth: { user: { id: 'user-1' } },
      session: {
        get: () => undefined,
        put: () => undefined,
        forget: () => undefined,
        commit: () => undefined,
      },
      inertia: { location: () => undefined },
      response: {},
    }

    let thrown: unknown
    try {
      await new SwitchOrganizationController(actions).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
