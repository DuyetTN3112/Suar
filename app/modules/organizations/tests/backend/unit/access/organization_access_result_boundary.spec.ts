import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationAccessActionFactory } from '#modules/organizations/actions/ports/inbound/access/organization_access_action_factory'
import ShowDepartmentsController from '#modules/organizations/controllers/access/show_departments_controller'
import ShowPermissionsController from '#modules/organizations/controllers/access/show_permissions_controller'
import ShowRolesController from '#modules/organizations/controllers/access/show_roles_controller'
import UpdateRolesController from '#modules/organizations/controllers/access/update_roles_controller'

const context = () => ({
  auth: { user: { id: 'user-1' } },
  currentOrganizationId: 'org-1',
  request: {
    input: () => undefined,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: {
    redirect: () => ({ back: () => undefined }),
  },
  session: { flash: () => undefined, get: () => undefined },
  inertia: { render: () => undefined },
})

const failingAction = () => {
  const failure = new ForbiddenException('Organization access denied')
  return {
    failure,
    action: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

test.group('Organization access Result boundaries', () => {
  test('departments page preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = {
      makeGetAccessConfiguration: () => action,
    } as unknown as OrganizationAccessActionFactory

    let thrown: unknown
    try {
      await new ShowDepartmentsController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('roles page preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = {
      makeGetAccessConfiguration: () => action,
    } as unknown as OrganizationAccessActionFactory

    let thrown: unknown
    try {
      await new ShowRolesController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('permissions page preserves expected query failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = {
      makeGetAccessConfiguration: () => action,
    } as unknown as OrganizationAccessActionFactory

    let thrown: unknown
    try {
      await new ShowPermissionsController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('custom roles mutation preserves expected command failures', async ({ assert }) => {
    const { failure, action } = failingAction()
    const actions = {
      makeUpdateCustomRoles: () => action,
    } as unknown as OrganizationAccessActionFactory

    let thrown: unknown
    try {
      await new UpdateRolesController(actions).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
