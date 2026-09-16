import { test } from '@japa/runner'

import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { ProjectLifecycleCommandFactory } from '#modules/projects/actions/ports/inbound/project_lifecycle_command_factory'
import DeleteProjectApiController from '#modules/projects/controllers/project-context/delete_project_api_controller'
import DeleteProjectController from '#modules/projects/controllers/project-context/delete_project_controller'

const commandFailure = () => {
  const failure = new NotFoundException('Project not found')
  return {
    failure,
    command: {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      handle: () => Promise.reject(new Error('controller must use executeAndWrap')),
    },
  }
}

const context = () => ({
  auth: { user: { id: 'user-1' } },
  currentOrganizationId: 'org-1',
  params: { projectId: 'project-1' },
  request: {
    input: () => undefined,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  response: {
    noContent: () => undefined,
    redirect: () => ({ toRoute: () => undefined }),
  },
  session: {
    flash: () => undefined,
    get: () => undefined,
  },
})

test.group('Delete project Result boundaries', () => {
  test('web controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = commandFailure()
    const factory = { makeDelete: () => command } as unknown as ProjectLifecycleCommandFactory

    let thrown: unknown
    try {
      await new DeleteProjectController(factory).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('API controller preserves expected command failures', async ({ assert }) => {
    const { failure, command } = commandFailure()
    const factory = { makeDelete: () => command } as unknown as ProjectLifecycleCommandFactory

    let thrown: unknown
    try {
      await new DeleteProjectApiController(factory).handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
