import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationSwitchCommandFactory } from '#modules/organizations/actions/ports/inbound/access/organization_switch_command_factory'
import SwitchAndRedirectController from '#modules/organizations/controllers/access/switch_and_redirect_controller'

const makeCommandFactory = (failure: ForbiddenException) =>
  ({
    make: () => ({
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }),
  }) as unknown as OrganizationSwitchCommandFactory

const makeContext = () => ({
  params: { organizationId: 'org-2' },
  request: {
    input: (key: string) => (key === 'organizationId' ? 'org-2' : undefined),
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  auth: { user: { id: 'user-1' } },
  session: {
    get: (_key: string, fallback?: unknown) => fallback,
    put: () => undefined,
    forget: () => undefined,
    commit: () => undefined,
    flash: () => undefined,
  },
  response: { redirect: () => undefined },
})

test.group('Organization switch-and-redirect Result boundaries', () => {
  test('POST/API switch path unwraps the command Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Cannot switch organization')
    let thrown: unknown
    try {
      await new SwitchAndRedirectController(makeCommandFactory(failure)).switchOrganization(
        makeContext() as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('legacy redirect path unwraps the command Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Cannot switch organization')
    let thrown: unknown
    try {
      await new SwitchAndRedirectController(makeCommandFactory(failure)).handle(
        makeContext() as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
