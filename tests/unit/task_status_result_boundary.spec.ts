import { test } from '@japa/runner'

import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import { Result } from '#modules/errors/public_contracts/result'
import BatchUpdateTaskStatusController from '#modules/tasks/controllers/batch_update_task_status_controller'
import CheckCreatePermissionController from '#modules/tasks/controllers/task-authoring/check_create_permission_controller'
import CreateTaskStatusController from '#modules/tasks/controllers/create_task_status_controller'
import DeleteTaskStatusController from '#modules/tasks/controllers/delete_task_status_controller'
import EditTaskController from '#modules/tasks/controllers/edit_task_controller'
import GetTaskAuditLogsController from '#modules/tasks/controllers/task-reading/get_task_audit_logs_controller'
import ListTaskStatusesController from '#modules/tasks/controllers/list_task_statuses_controller'
import ListTasksGroupedController from '#modules/tasks/controllers/list_tasks_grouped_controller'
import ListTasksTimelineController from '#modules/tasks/controllers/list_tasks_timeline_controller'
import ListWorkflowController from '#modules/tasks/controllers/list_workflow_controller'
import ReplaceTaskWorkflowTransitionsController from '#modules/tasks/controllers/replace_task_workflow_transitions_controller'
import UpdateTaskSortOrderController from '#modules/tasks/controllers/update_task_sort_order_controller'
import UpdateTaskStatusController from '#modules/tasks/controllers/update_task_status_controller'
import UpdateTaskStatusDefinitionController from '#modules/tasks/controllers/update_task_status_definition_controller'
import UpdateTaskTimeController from '#modules/tasks/controllers/update_task_time_controller'
import AddTaskRequirementController from '#modules/tasks/controllers/v1/add_task_requirement_controller'
import ListTaskRequirementVersionsController from '#modules/tasks/controllers/v1/list_task_requirement_versions_controller'
import PrefillTaskRequirementsFromRoleController from '#modules/tasks/controllers/v1/prefill_task_requirements_from_role_controller'
import RemoveTaskRequirementController from '#modules/tasks/controllers/v1/remove_task_requirement_controller'
import UpdateTaskRequirementController from '#modules/tasks/controllers/v1/update_task_requirement_controller'
import V1CreateTaskStatusController from '#modules/tasks/controllers/v1/create_task_status_controller'
import V1DeleteTaskStatusController from '#modules/tasks/controllers/v1/delete_task_status_controller'
import V1ListTaskStatusesController from '#modules/tasks/controllers/v1/list_task_statuses_controller'
import V1ListWorkflowController from '#modules/tasks/controllers/v1/list_workflow_controller'
import V1ReplaceTaskWorkflowTransitionsController from '#modules/tasks/controllers/v1/replace_task_workflow_transitions_controller'
import V1ShowTaskStatusController from '#modules/tasks/controllers/v1/show_task_status_controller'
import V1UpdateTaskStatusController from '#modules/tasks/controllers/v1/update_task_status_controller'

function context(overrides: Record<string, unknown> = {}) {
  const input = (key: string, fallback?: unknown) =>
    ({
      name: 'In progress',
      slug: 'in_progress',
      taskStatusId: 'status-2',
      task_status_id: 'status-2',
      taskIds: ['task-1'],
      task_ids: ['task-1'],
      estimated_time: 1,
      ...overrides,
    })[key] ?? fallback

  return {
    auth: { user: { id: 'user-1', current_organization_id: 'org-1' } },
    currentOrganizationId: 'org-1',
    params: { taskStatusId: 'status-1', taskId: 'task-1' },
    request: {
      input,
      only: (keys: string[]) =>
        Object.fromEntries(
          keys
            .map((key) => [key, input(key)] as const)
            .filter(([, value]) => value !== undefined)
        ),
      ip: () => '127.0.0.1',
      header: () => 'unit-test',
    },
    response: {
      redirect: () => undefined,
      status: () => undefined,
      noContent: () => undefined,
      json: () => undefined,
    },
    session: { get: () => undefined },
  }
}

async function assertFailure(assert: { strictEqual: (actual: unknown, expected: unknown) => void }, run: () => Promise<unknown>, failure: Error) {
  let thrown: unknown
  try {
    await run()
  } catch (error: unknown) {
    thrown = error
  }

  assert.strictEqual(thrown, failure)
}

test.group('Task status Result boundaries', () => {
  test('canonical create, delete, list and update controllers unwrap Result failures', async ({ assert }) => {
    const failure = new ForbiddenException('Status access denied')
    const wrapped = () => Promise.resolve(Result.fail(failure))
    const direct = () => Promise.reject(new Error('controller must use wrapped execution'))
    const factory = {
      makeCreate: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeDelete: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeUpdate: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const workflowFactory = {
      makeUpdateStatus: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const query = { executeAndWrap: wrapped, execute: direct }

    await assertFailure(assert, () => new CreateTaskStatusController(factory as never).handle(context() as never), failure)
    await assertFailure(assert, () => new DeleteTaskStatusController(factory as never).handle(context() as never), failure)
    await assertFailure(assert, () => new ListTaskStatusesController(query as never).handle(context() as never), failure)
    await assertFailure(
      assert,
      () => new UpdateTaskStatusController(workflowFactory as never).handle(context() as never),
      failure
    )
  })

  test('v1 create, delete and list controllers share the Result boundary', async ({ assert }) => {
    const failure = new ForbiddenException('Status access denied')
    const wrapped = () => Promise.resolve(Result.fail(failure))
    const direct = () => Promise.reject(new Error('controller must use wrapped execution'))
    const factory = {
      makeCreate: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeDelete: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const query = { executeAndWrap: wrapped, execute: direct }

    await assertFailure(assert, () => new V1CreateTaskStatusController(factory as never).handle(context() as never), failure)
    await assertFailure(assert, () => new V1DeleteTaskStatusController(factory as never).handle(context() as never), failure)
    await assertFailure(assert, () => new V1ListTaskStatusesController(query as never).handle(context() as never), failure)
  })

  test('status definition and workflow controllers unwrap Result failures', async ({ assert }) => {
    const failure = new ForbiddenException('Status workflow access denied')
    const wrapped = () => Promise.resolve(Result.fail(failure))
    const direct = () => Promise.reject(new Error('controller must use wrapped execution'))
    const definitionFactory = {
      makeUpdateStatus: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeUpdate: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const workflowFactory = {
      makeUpdateStatus: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeReplaceWorkflow: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeBatchUpdate: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeUpdateSortOrder: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeUpdateTime: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const boardQueries = {
      makeGrouped: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeTimeline: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const query = { executeAndWrap: wrapped, execute: direct }

    await assertFailure(
      assert,
      () => new UpdateTaskStatusDefinitionController(definitionFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new ListWorkflowController(query as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new ReplaceTaskWorkflowTransitionsController(workflowFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new BatchUpdateTaskStatusController(workflowFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () =>
        new UpdateTaskSortOrderController(workflowFactory as never).handle(
          context({ sortOrder: 1 }) as never
        ),
      failure
    )
    await assertFailure(
      assert,
      () => new UpdateTaskTimeController(workflowFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new ListTasksGroupedController(boardQueries as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new ListTasksTimelineController(boardQueries as never).handle(context() as never),
      failure
    )
    const detailQueries = {
      makeAuditLogs: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    await assertFailure(
      assert,
      () => new GetTaskAuditLogsController(detailQueries as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => {
        const editPageQueries = {
          makeEditPage: () => ({ executeAndWrap: wrapped, execute: direct }),
        }
        const lifecycleCommands = Object.create(null) as never
        return new EditTaskController(lifecycleCommands, editPageQueries as never).showForm(context() as never)
      },
      failure
    )
    await assertFailure(
      assert,
      () =>
        new UpdateTaskRequirementController({ executeAndWrap: wrapped, execute: direct } as never).handle({
          ...context(),
          params: { requirementId: 'requirement-1' },
        } as never),
      failure
    )
    await assertFailure(
      assert,
      () =>
        new ListTaskRequirementVersionsController({
          executeAndWrap: wrapped,
          execute: direct,
        } as never).handle({ ...context(), params: { taskId: 'task-1' } } as never),
      failure
    )
    await assertFailure(
      assert,
      () =>
        new PrefillTaskRequirementsFromRoleController({
          executeAndWrap: wrapped,
          execute: direct,
        } as never).handle(
          {
            ...context({ projectProfessionalRoleId: '00000000-0000-4000-8000-000000000002' }),
            params: { taskId: 'task-1' },
          } as never
        ),
      failure
    )
    await assertFailure(
      assert,
      () =>
        new RemoveTaskRequirementController({ executeAndWrap: wrapped, execute: direct } as never).handle({
          ...context(),
          params: { requirementId: 'requirement-1' },
          response: { noContent: () => undefined },
        } as never),
      failure
    )
    await assertFailure(
      assert,
      () => {
        const permissionQuery = {
          executeAndWrap: wrapped,
          execute: direct,
        }
        return new CheckCreatePermissionController(permissionQuery as never).handle(context() as never)
      },
      failure
    )
    await assertFailure(
      assert,
      () => {
        const requirementCommand = { executeAndWrap: wrapped, execute: direct }
        const requirementContext = {
          ...context({ skillId: '00000000-0000-4000-8000-000000000001' }),
          params: { taskId: 'task-1' },
          response: { created: () => undefined },
        }
        return new AddTaskRequirementController(requirementCommand as never).handle(requirementContext as never)
      },
      failure
    )
  })

  test('v1 status definition and workflow controllers share the Result boundary', async ({ assert }) => {
    const failure = new ForbiddenException('Status workflow access denied')
    const wrapped = () => Promise.resolve(Result.fail(failure))
    const direct = () => Promise.reject(new Error('controller must use wrapped execution'))
    const definitionFactory = {
      makeUpdateStatus: () => ({ executeAndWrap: wrapped, execute: direct }),
      makeUpdate: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const workflowFactory = {
      makeReplaceWorkflow: () => ({ executeAndWrap: wrapped, execute: direct }),
    }
    const query = { executeAndWrap: wrapped, execute: direct }

    await assertFailure(
      assert,
      () => new V1UpdateTaskStatusController(definitionFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new V1ListWorkflowController(query as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new V1ReplaceTaskWorkflowTransitionsController(workflowFactory as never).handle(context() as never),
      failure
    )
    await assertFailure(
      assert,
      () => new V1ShowTaskStatusController(query as never).handle(context() as never),
      failure
    )
  })
})
