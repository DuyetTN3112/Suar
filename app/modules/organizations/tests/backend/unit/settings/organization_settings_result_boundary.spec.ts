import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationSettingsActionFactory } from '#modules/organizations/actions/ports/inbound/settings/organization_settings_action_factory'
import ShowSettingsController from '#modules/organizations/controllers/settings/show_settings_controller'
import UpdateSettingsController from '#modules/organizations/controllers/settings/update_settings_controller'

const context = () => ({
  auth: { user: { id: 'user-1' } },
  currentOrganizationId: 'org-1',
  request: {
    body: () => ({}),
    input: () => undefined,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: {
    redirect: () => ({ back: () => undefined, toRoute: () => undefined }),
  },
  session: { flash: () => undefined, get: () => undefined },
  inertia: { render: () => undefined },
})

const failingAction = () => {
  const failure = new NotFoundException('Organization not found')
  return {
    failure,
    action: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Organization settings Result boundaries', () => {
  test('show settings controller preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeGetSettings: () => action } as unknown as OrganizationSettingsActionFactory

    let thrown: unknown
    try {
      await new ShowSettingsController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('update settings controller preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = { makeUpdateSettings: () => action } as unknown as OrganizationSettingsActionFactory

    let thrown: unknown
    try {
      await new UpdateSettingsController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
