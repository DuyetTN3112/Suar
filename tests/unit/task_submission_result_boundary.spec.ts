import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import TaskSubmissionController from '#modules/tasks/controllers/task_submission_controller'

test.group('Task submission Result boundaries', () => {
  test('submission show controller unwraps the query Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Submission access denied')
    const applications = {
      makeGetSubmission: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as TaskCompletionApplicationFactory
    const ctx = {
      params: { taskId: 'task-1' },
      auth: { user: { id: 'user-1' } },
      request: { ip: () => '127.0.0.1', header: () => 'unit-test' },
      response: { status: () => ({ json: () => undefined }) },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new TaskSubmissionController(applications).show(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
