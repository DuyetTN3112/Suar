import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import EditTaskController from '#modules/tasks/controllers/task-authoring/edit_task_controller'

test.group('Task update Result boundary', () => {
  test('uses the wrapped command result at the HTTP boundary', async ({ assert }) => {
    const failure = new ConflictException('Task changed before update')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const commands = {
      makeUpdate: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new EditTaskController(commands, {} as never)
    const ctx = {
      params: { taskId: 'task-1' },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
      request: {
        body: () => ({ title: 'Updated task' }),
        input: () => undefined,
        ip: () => '127.0.0.1',
        header: () => null,
      },
      response: {},
      session: { flash: () => undefined },
    }

    let thrown: unknown
    try {
      await controller.handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })
})
