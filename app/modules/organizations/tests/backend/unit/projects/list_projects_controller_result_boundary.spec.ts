import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ListProjectsController from '#modules/organizations/controllers/projects/list_projects_controller'

function context() {
  return {
    auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
    currentOrganizationId: 'org-1',
    currentOrganizationRole: null,
    request: {
      input: () => undefined,
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    inertia: { render: () => undefined },
  }
}

test('organization project listing unwraps expected query failures', async ({ assert }) => {
  const failure = new ForbiddenException('Project access denied')
  const query = {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
  }

  let thrown: unknown
  try {
    await new ListProjectsController({ makeListProjects: () => query } as never).handle(
      context() as never
    )
  } catch (error) {
    thrown = error
  }

  assert.strictEqual(thrown, failure)
})
