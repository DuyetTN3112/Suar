import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import DeleteTaskController from '#modules/tasks/controllers/task-authoring/delete_task_controller'

test.group('Task delete Result boundary', () => {
  test('uses the wrapped command result and preserves expected command failures', async ({
    assert,
  }) => {
    const failure = new ConflictException('Task cannot be deleted')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = {
      makeDelete: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new DeleteTaskController(factory)
    const ctx = {
      params: { taskId: 'task-1' },
      request: {
        input: (key: string, fallback?: unknown) => (key === 'permanent' ? fallback : undefined),
        header: () => null,
        ip: () => '127.0.0.1',
      },
      response: {
        noContent: () => undefined,
        redirect: () => ({ toRoute: () => undefined }),
      },
      session: { flash: () => undefined },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    }

    let thrown: unknown
    try {
      await controller.handle(ctx as never)
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
      makeDelete: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const controller = new DeleteTaskController(factory)
    const ctx = {
      params: { taskId: 'task-1' },
      request: {
        input: (key: string, fallback?: unknown) => (key === 'permanent' ? fallback : undefined),
        header: () => null,
        ip: () => '127.0.0.1',
      },
      response: {},
      session: { flash: () => undefined },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    }

    let thrown: unknown
    try {
      await controller.handle(ctx as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })

  test('preserves session flash and canonical redirect after success', async ({ assert }) => {
    const flashes: unknown[] = []
    let redirectedTo: string | undefined
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok({ success: true, message: 'deleted' })),
    }
    const factory = { makeDelete: () => command } as unknown as TaskLifecycleCommandFactory
    const controller = new DeleteTaskController(factory)
    const ctx = {
      params: { taskId: 'task-1' },
      request: {
        input: (key: string, fallback?: unknown) => (key === 'permanent' ? fallback : undefined),
        header: () => null,
        ip: () => '127.0.0.1',
      },
      response: {
        redirect: () => ({
          toRoute: (name: string) => {
            redirectedTo = name
          },
        }),
      },
      session: { flash: (...args: unknown[]) => flashes.push(args) },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    }

    await controller.handle(ctx as never)

    assert.deepEqual(flashes, [['success', 'Nhiệm vụ đã được xóa thành công']])
    assert.equal(redirectedTo, 'tasks.index')
  })

  test('preserves Inertia no-content response after success', async ({ assert }) => {
    let noContentCalled = false
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok({ success: true, message: 'deleted' })),
    }
    const factory = { makeDelete: () => command } as unknown as TaskLifecycleCommandFactory
    const controller = new DeleteTaskController(factory)
    const ctx = {
      params: { taskId: 'task-1' },
      request: {
        input: (key: string, fallback?: unknown) => (key === 'permanent' ? fallback : undefined),
        header: (name: string) => (name === 'X-Inertia' ? 'true' : null),
        ip: () => '127.0.0.1',
      },
      response: { noContent: () => (noContentCalled = true) },
      session: { flash: () => undefined },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    }

    await controller.handle(ctx as never)

    assert.isTrue(noContentCalled)
  })
})
