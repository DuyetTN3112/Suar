import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectQueryFactory } from '#modules/projects/actions/ports/inbound/project_query_factory'
import GetProjectTaskAuthoringContextController from '#modules/projects/controllers/project-context/get_project_task_authoring_context_controller'

test('task authoring context controller unwraps the expected query failure', async ({ assert }) => {
  const failure = NotFoundException.project('project-1')
  const query = {
    executeAndWrap: () => Promise.resolve(Result.fail(failure)),
    handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
  }
  const controller = new GetProjectTaskAuthoringContextController({
    makeTaskAuthoringContext: () => query,
  } as unknown as ProjectQueryFactory)
  const ctx = {
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: 'org-1',
    params: { projectId: 'project-1' },
    request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
    session: { get: () => undefined },
  }

  let thrown: unknown
  try {
    await controller.handle(ctx as never)
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, failure)
})
