import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import UpdateProjectApiController from '#modules/projects/controllers/project-context/update_project_api_controller'

test.group('Update project Result boundary', () => {
  test('API controller preserves expected command failures', async ({ assert }) => {
    const failure = new NotFoundException('Project not found')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = { makeUpdate: () => command } as unknown as ProjectLifecycleCommandFactory
    const ctx = {
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      params: { projectId: 'project-1' },
      request: {
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
    }

    let thrown: unknown
    try {
      await new UpdateProjectApiController(factory).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
