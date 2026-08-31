import { test } from '@japa/runner'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import { Result } from '#modules/errors/public_contracts/result'
import type { OrganizationProjectCreationCommandFactory } from '#modules/organizations/actions/ports/inbound/projects/organization_project_creation_command_factory'
import CreateProjectController from '#modules/organizations/controllers/projects/create_project_controller'
import type { OrganizationWorkflowCommandFactory } from '#modules/organizations/actions/ports/inbound/workflow/organization_workflow_command_factory'
import CreateTaskStatusController from '#modules/organizations/controllers/workflow/create_task_status_controller'

const makeContext = (input: Record<string, unknown>) => ({
  request: {
    input: (key: string, fallback?: unknown) => input[key] ?? fallback,
    ip: () => '127.0.0.1',
    header: () => 'unit-test',
  },
  auth: { user: { id: 'owner-1' } },
  currentOrganizationId: 'org-1',
  session: { get: () => undefined },
  response: { redirect: () => ({ back: () => undefined }) },
  inertia: { location: () => undefined },
})

test.group('Organization create mutation Result boundaries', () => {
  test('create-project controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new ConflictException('Project slug already exists')
    const actions = {
      make: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationProjectCreationCommandFactory

    let thrown: unknown
    try {
      await new CreateProjectController(actions).handle(
        makeContext({ name: 'Project', slug: 'project' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('create-task-status controller unwraps the command Result contract', async ({ assert }) => {
    const failure = new ConflictException('Task status already exists')
    const actions = {
      makeCreateTaskStatus: () => ({
        executeAndWrap: () => Promise.resolve(Result.fail(failure)),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationWorkflowCommandFactory

    let thrown: unknown
    try {
      await new CreateTaskStatusController(actions).handle(
        makeContext({ name: 'In progress', color: '#123456' }) as never
      )
    } catch (error: unknown) {
      thrown = error
    }

    assert.strictEqual(thrown, failure)
  })

  test('create-task-status controller preserves unexpected exceptions', async ({ assert }) => {
    const unexpected = new Error('database unavailable')
    const actions = {
      makeCreateTaskStatus: () => ({
        executeAndWrap: () => Promise.reject(unexpected),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationWorkflowCommandFactory

    await assert.rejects(
      () =>
        new CreateTaskStatusController(actions).handle(
          makeContext({ name: 'In progress', color: '#123456' }) as never
        ),
      unexpected.message
    )
  })

  test('create-task-status controller preserves the created API response and status', async ({
    assert,
  }) => {
    let statusCode: number | undefined
    let responseBody: unknown
    const context = {
      ...makeContext({ name: 'In progress', color: '#123456' }),
      httpTransportKind: 'api-canonical' as const,
      response: {
        status: (status: number) => {
          statusCode = status
          return {
            json: (body: unknown) => {
              responseBody = body
            },
          }
        },
        redirect: () => ({ toRoute: () => undefined, back: () => undefined }),
      },
    }
    const actions = {
      makeCreateTaskStatus: () => ({
        executeAndWrap: () =>
          Promise.resolve(
            Result.ok({
              id: 'status-1',
              name: 'In progress',
              slug: 'in_progress',
              color: '#123456',
            })
          ),
        execute: () => Promise.reject(new Error('controller must use wrapped execution')),
      }),
    } as unknown as OrganizationWorkflowCommandFactory

    await new CreateTaskStatusController(actions).handle(context as never)

    assert.strictEqual(statusCode, 201)
    assert.deepEqual(responseBody, {
      data: {
        id: 'status-1',
        name: 'In progress',
        slug: 'in_progress',
        color: '#123456',
      },
    })
  })
})
