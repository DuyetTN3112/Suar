import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { TaskLifecycleCommandFactory } from '#modules/tasks/actions/ports/inbound/task_lifecycle_command_factory'
import CreateTaskController from '#modules/tasks/controllers/task-authoring/create_task_controller'

const validBody = {
  title: 'Created task',
  taskStatusId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  projectId: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
  requiredSkills: [{ id: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f', level: 'l4' }],
  acceptanceCriteria: 'Task is complete when the requested behavior is verified',
}

function request(acceptsJson: boolean) {
  return {
    body: () => validBody,
    accepts: () => acceptsJson,
    input: () => undefined,
    ip: () => '127.0.0.1',
    header: () => null,
  }
}

test.group('Task create Result boundary', () => {
  test('maps expected BusinessLogicException to HTML back redirect and input flash', async ({
    assert,
  }) => {
    const failure = new BusinessLogicException('Task cannot be created')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = {
      makeCreate: () => command,
    } as unknown as TaskLifecycleCommandFactory
    const flashes: unknown[] = []
    let backRedirected = false
    const controller = new CreateTaskController(factory)

    await controller.handle({
      request: request(false),
      response: {
        redirect: () => {
          return {
            back: () => {
              backRedirected = true
            },
          }
        },
      },
      session: { flash: (...args: unknown[]) => flashes.push(args) },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    } as never)

    assert.deepEqual(flashes, [['inputErrorsBag', { form: 'Task cannot be created' }]])
    assert.isTrue(backRedirected)
  })

  test('preserves Result success JSON response', async ({ assert }) => {
    const task = { id: 'task-1', project_id: 'project-1', title: 'Created task' }
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok(task)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = { makeCreate: () => command } as unknown as TaskLifecycleCommandFactory
    let statusCode: number | undefined
    let jsonBody: unknown
    const controller = new CreateTaskController(factory)

    await controller.handle({
      request: request(true),
      response: {
        status: (status: number) => {
          statusCode = status
          return {
            json: (body: unknown) => {
              jsonBody = body
            },
          }
        },
      },
      session: { flash: () => undefined },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    } as never)

    assert.equal(statusCode, 201)
    assert.deepEqual(jsonBody, { data: task })
  })

  test('preserves Result success HTML flash and project redirect', async ({ assert }) => {
    const task = { id: 'task-1', project_id: 'project-1', title: 'Created task' }
    const command = {
      executeAndWrap: () => Promise.resolve(Result.ok(task)),
    }
    const factory = { makeCreate: () => command } as unknown as TaskLifecycleCommandFactory
    const flashes: unknown[] = []
    let redirectedTo: string | undefined
    const controller = new CreateTaskController(factory)

    await controller.handle({
      request: request(false),
      response: {
        redirect: (path: string) => {
          redirectedTo = path
        },
      },
      session: { flash: (...args: unknown[]) => flashes.push(args) },
      auth: { user: { id: 'user-1' } },
      currentOrganizationId: 'org-1',
    } as never)

    assert.deepEqual(flashes, [['success', 'Nhiệm vụ đã được tạo thành công']])
    assert.equal(redirectedTo, '/projects/project-1/tasks?task_id=task-1')
  })

  test('propagates unexpected command failures unchanged', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const command = { executeAndWrap: () => Promise.reject(unexpected) }
    const factory = { makeCreate: () => command } as unknown as TaskLifecycleCommandFactory
    const controller = new CreateTaskController(factory)

    let thrown: unknown
    try {
      await controller.handle({
        request: request(true),
        response: {},
        session: { flash: () => undefined },
        auth: { user: { id: 'user-1' } },
        currentOrganizationId: 'org-1',
      } as never)
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, unexpected)
  })
})
