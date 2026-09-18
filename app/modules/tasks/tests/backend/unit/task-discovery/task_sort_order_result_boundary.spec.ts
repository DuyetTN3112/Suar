import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'
import UpdateTaskSortOrderController from '#modules/tasks/controllers/task-authoring/update_task_sort_order_controller'

function context() {
  return {
    params: { taskId: 'task-1' },
    request: {
      only: () => ({ sortOrder: 7, taskStatusId: 'status-2' }),
      ip: () => '127.0.0.1',
      header: () => null,
    },
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: 'org-1',
  }
}

test.group('Task sort-order Result boundary', () => {
  test('uses executeAndWrap and preserves expected command failures', async ({ assert }) => {
    const failure = new ConflictException('Task sort order cannot be changed')
    const command = {
      executeAndWrap: (input: unknown) => {
        assert.deepEqual(input, {
          taskId: 'task-1',
          newSortOrder: 7,
          newTaskStatusId: 'status-2',
        })
        return Promise.resolve(Result.fail(failure))
      },
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = {
      makeUpdateSortOrder: () => command,
    } as unknown as TaskStatusWorkflowCommandFactory
    const controller = new UpdateTaskSortOrderController(factory)

    let thrown: unknown
    try {
      await controller.handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('propagates unexpected command failures unchanged', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const command = {
      executeAndWrap: () => Promise.reject(unexpected),
    }
    const factory = {
      makeUpdateSortOrder: () => command,
    } as unknown as TaskStatusWorkflowCommandFactory
    const controller = new UpdateTaskSortOrderController(factory)

    let thrown: unknown
    try {
      await controller.handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })

  test('preserves the canonical success response body', async ({ assert }) => {
    const task = {
      id: 'task-1',
      sort_order: 7,
      task_status_id: 'status-2',
      status: 'in_progress',
    }
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok(task)),
    }
    const factory = {
      makeUpdateSortOrder: () => command,
    } as unknown as TaskStatusWorkflowCommandFactory
    const controller = new UpdateTaskSortOrderController(factory)

    const response = await controller.handle(context() as never)

    assert.deepEqual(response, { data: task })
  })
})
