import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskCompletionApplicationFactory } from '#modules/tasks/actions/ports/inbound/task_completion_application_factory'
import TaskAttachmentController from '#modules/tasks/controllers/task-attachments/task_attachment_controller'

test.group('Task attachment Result boundaries', () => {
  test('attachment index controller unwraps the query Result contract', async ({ assert }) => {
    const failure = new ForbiddenException('Attachment access denied')
    const applications = {
      makeListAttachments: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as TaskCompletionApplicationFactory
    const ctx = {
      params: { taskId: 'task-1' },
      auth: { user: { id: 'user-1' } },
      request: {
        qs: () => ({}),
        ip: () => '127.0.0.1',
        header: () => 'unit-test',
      },
      response: { status: () => ({ json: () => undefined }) },
      session: { get: () => undefined },
    }

    let thrown: unknown
    try {
      await new TaskAttachmentController(applications).index(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
