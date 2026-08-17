import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import ListWorkflowController from '#modules/tasks/controllers/task-workflow/list_workflow_controller'
import ReplaceTaskWorkflowTransitionsController from '#modules/tasks/controllers/task-workflow/replace_task_workflow_transitions_controller'
import type { TaskStatusWorkflowCommandFactory } from '#modules/tasks/actions/ports/inbound/task_status_workflow_command_factory'

function context(transitions: unknown[] = []) {
  return {
    auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
    currentOrganizationId: 'org-1',
    request: {
      input: (key: string, fallback?: unknown) => (key === 'transitions' ? transitions : fallback),
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    session: { get: () => undefined },
  }
}

async function assertThrown(
  assert: { strictEqual: (actual: unknown, expected: unknown) => void },
  run: () => Promise<unknown>,
  expected: unknown
) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, expected)
}

test.group('Task workflow Result boundaries', () => {
  test('replace unwraps expected command failures without changing their identity', async ({
    assert,
  }) => {
    const failure = new ForbiddenException('Workflow access denied')
    const command = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }
    const factory = {
      makeReplaceWorkflow: () => command,
    } as unknown as TaskStatusWorkflowCommandFactory

    await assertThrown(
      assert,
      () => new ReplaceTaskWorkflowTransitionsController(factory).handle(context() as never),
      failure
    )
  })

  test('replace preserves unexpected command failures', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const factory = {
      makeReplaceWorkflow: () => ({
        executeAndWrap: () => Promise.reject(unexpected),
      }),
    } as unknown as TaskStatusWorkflowCommandFactory

    await assertThrown(
      assert,
      () => new ReplaceTaskWorkflowTransitionsController(factory).handle(context() as never),
      unexpected
    )
  })

  test('replace preserves the workflow response body', async ({ assert }) => {
    const transitions = [
      {
        id: 'transition-1',
        organization_id: 'org-1',
        from_status_id: 'status-1',
        to_status_id: 'status-2',
        conditions: {},
      },
    ]
    const factory = {
      makeReplaceWorkflow: () => ({
        executeAndWrap: () => Promise.resolve(Result.ok(transitions)),
      }),
    } as unknown as TaskStatusWorkflowCommandFactory

    const response = await new ReplaceTaskWorkflowTransitionsController(factory).handle(
      context() as never
    )

    assert.deepEqual(response, {
      data: [
        {
          id: 'transition-1',
          organizationId: 'org-1',
          fromStatusId: 'status-1',
          toStatusId: 'status-2',
          conditions: {},
          createdAt: null,
          fromStatus: null,
          toStatus: null,
        },
      ],
    })
  })

  test('list unwraps expected query failures without changing their identity', async ({ assert }) => {
    const failure = new ForbiddenException('Workflow access denied')
    const query = {
      executeAndWrap: () => Promise.resolve(Result.fail(failure)),
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }

    await assertThrown(
      assert,
      () => new ListWorkflowController(query as never).handle(context() as never),
      failure
    )
  })

  test('list preserves unexpected query failures', async ({ assert }) => {
    const unexpected = new Error('database connection lost')
    const query = {
      executeAndWrap: () => Promise.reject(unexpected),
    }

    await assertThrown(
      assert,
      () => new ListWorkflowController(query as never).handle(context() as never),
      unexpected
    )
  })

  test('list preserves the workflow response body', async ({ assert }) => {
    const transitions = [
      {
        id: 'transition-1',
        organization_id: 'org-1',
        from_status_id: 'status-1',
        to_status_id: 'status-2',
        conditions: {},
      },
    ]
    let receivedOrganizationId: string | undefined
    const query = {
      executeAndWrap: async (organizationId: string) => {
        receivedOrganizationId = organizationId
        return Result.ok(transitions)
      },
      execute: () => Promise.reject(new Error('controller must use executeAndWrap')),
    }

    const response = await new ListWorkflowController(query as never).handle(context() as never)

    assert.strictEqual(receivedOrganizationId, 'org-1')
    assert.deepEqual(response, {
      data: [
        {
          id: 'transition-1',
          organizationId: 'org-1',
          fromStatusId: 'status-1',
          toStatusId: 'status-2',
          conditions: {},
          createdAt: null,
          fromStatus: null,
          toStatus: null,
        },
      ],
    })
  })
})
