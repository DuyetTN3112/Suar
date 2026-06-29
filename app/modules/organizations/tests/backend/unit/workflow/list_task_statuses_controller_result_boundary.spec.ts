import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ListTaskStatusesController from '#modules/organizations/controllers/workflow/list_task_statuses_controller'

function context() {
  return {
    auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
    currentOrganizationId: 'org-1',
    currentOrganizationRole: null,
    request: {
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    inertia: { render: () => undefined },
  }
}

test('organization workflow status listing unwraps expected query failures', async ({ assert }) => {
  const failure = new ForbiddenException('Workflow status access denied')
  const query = {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
  }

  let thrown: unknown
  try {
    await new ListTaskStatusesController({ makeListTaskStatuses: () => query } as never).handle(
      context() as never
    )
  } catch (error) {
    thrown = error
  }

  assert.strictEqual(thrown, failure)
})
