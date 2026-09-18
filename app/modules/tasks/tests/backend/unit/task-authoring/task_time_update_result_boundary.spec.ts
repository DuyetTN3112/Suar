import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import UpdateTaskTimeController from '#modules/tasks/controllers/task-authoring/update_task_time_controller'

function context(overrides: Record<string, unknown> = {}) {
  return {
    params: { taskId: 'task-1' },
    auth: { user: { id: 'user-1' } },
    currentOrganizationId: 'org-1',
    request: {
      input: (key: string) => (key === 'estimated_time' ? 8 : undefined),
      ip: () => '127.0.0.1',
      header: () => null,
    },
    response: {
      redirect: () => ({ back: () => undefined }),
    },
    session: { flash: () => undefined },
    ...overrides,
  }
}

test.group('Task time update Result boundary', () => {
  test('uses the wrapped command result and preserves expected command failures', async ({
    assert,
  }) => {
    const failure = new ConflictException('Task time changed before update')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = {
      makeUpdateTime: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new UpdateTaskTimeController(factory)

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
    const command = { executeAndWrap: () => Promise.reject(unexpected) }
    const factory = {
      makeUpdateTime: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new UpdateTaskTimeController(factory)

    let thrown: unknown
    try {
      await controller.handle(context() as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })

  test('preserves success flash and back redirect', async ({ assert }) => {
    const flashes: unknown[] = []
    let redirectedBack = false
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok({ id: 'task-1' })),
    }
    const factory = {
      makeUpdateTime: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new UpdateTaskTimeController(factory)

    await controller.handle(
      context({
        response: {
          redirect: () => ({
            back: () => {
              redirectedBack = true
            },
          }),
        },
        session: { flash: (...args: unknown[]) => flashes.push(args) },
      }) as never
    )

    assert.deepEqual(flashes, [['success', 'Thời gian đã được cập nhật']])
    assert.isTrue(redirectedBack)
  })
})
