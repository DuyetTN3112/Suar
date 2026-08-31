import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import CreateProjectController from '#modules/projects/controllers/project-context/create_project_controller'

test.group('Project create page Result boundary', () => {
  test('create page controller unwraps query failures', async ({ assert }) => {
    const failure = new ForbiddenException('Project create page denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use wrapped execution')),
    }
    const ctx = {
      auth: { user: { id: 'user-1' } },
      inertia: { render: () => undefined },
      request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new CreateProjectController({ makeCreatePage: () => query } as never).handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
