import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import UpdateTaskCommand from '#modules/tasks/actions/commands/task-authoring/update_task_command'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/outbound/task_query_repository_port'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskAuthoringIdempotentReplay } from '#modules/tasks/domain/task-authoring/task_authoring_idempotency'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import type { TaskAuthoringSummaryRecord, TaskRecord } from '#modules/tasks/types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const taskEvents = new InProcessTaskEventPublisher()

class NotificationStub implements NotificationStager {
  async stage() {
    return await Promise.resolve(null)
  }
}

function resolvedVoid(): Promise<void> {
  return Promise.resolve()
}

class TaskCacheStub implements TaskCachePort {
  invalidateAfterTaskCreated() {
    return resolvedVoid()
  }
  invalidateAfterTaskCollectionMetadataChanged() {
    return resolvedVoid()
  }
  invalidateAfterTaskUpdated() {
    return resolvedVoid()
  }
  invalidateAfterTaskDeleted() {
    return resolvedVoid()
  }
  invalidateAfterTaskAssigned() {
    return resolvedVoid()
  }
  invalidateAfterTaskAccessChanged() {
    return resolvedVoid()
  }
  invalidateAfterTaskApplicationChanged() {
    return resolvedVoid()
  }
  invalidateTaskScopedCaches() {
    return resolvedVoid()
  }
}

class TestableUpdateTaskCommand extends UpdateTaskCommand {
  constructor(
    execCtx: TaskActionContext,
    createNotification: NotificationStager,
    dependencies: ConstructorParameters<typeof UpdateTaskCommand>[5] & {
      taskRepository: TaskDetailQueryRepositoryPort
    },
    private trx: TaskTransaction
  ) {
    const { taskRepository, ...commandDependencies } = dependencies
    const lifecycle = new Proxy(taskExternalDeps.lifecycle, {
      get(target, property, receiver): unknown {
        if (property === 'findTaskDetail') {
          return (taskId: string) => taskRepository.findByIdWithDetailRecord(taskId)
        }
        return Reflect.get(target, property, receiver) as unknown
      },
    })
    const externalDependencies = {
      ...taskExternalDeps,
      lifecycle,
    }
    super(
      execCtx,
      externalDependencies,
      createNotification,
      new TaskCacheStub(),
      taskEvents,
      commandDependencies
    )
  }

  protected override async executeInTransaction<T>(
    callback: (trx: TaskTransaction) => Promise<T>
  ): Promise<T> {
    return await callback(this.trx)
  }
}

function makeExecCtx(userId: string | null = VALID_UUID): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID_2,
  }
}

function makeTask(id = VALID_UUID_3): TaskRecord {
  const task = {
    id,
    title: 'Update orchestration flow',
    toJSON() {
      return { id, title: 'Update orchestration flow' }
    },
  }

  return task as unknown as TaskRecord
}

function makeTransaction(): TaskTransaction {
  return {}
}

function makeAuthoringSummary(): TaskAuthoringSummaryRecord {
  return {
    mode: 'evidence_enabled',
    intent: 'save_draft',
    specificationVersionId: VALID_UUID_2,
    contractVersionId: null,
    headRevision: 2,
    readiness: {
      policyVersion: 'suar.task-readiness.v1',
      workState: 'draft',
      evidenceState: 'needs_clarification',
      assignmentReady: false,
      evidenceReady: false,
      blockers: [],
      warnings: [],
      assessedAt: '2026-08-01T10:00:00.000Z',
    },
    idempotencyKey: 'task-version:2',
    requestHash: `sha256:${'a'.repeat(64)}`,
  }
}

test.group('UpdateTaskCommand shell orchestration', () => {
  test('requires an authenticated user before updating a task', async ({ assert }) => {
    const command = new UpdateTaskCommand(
      makeExecCtx(null),
      taskExternalDeps,
      new NotificationStub(),
      new TaskCacheStub(),
      taskEvents
    )
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Renamed task' })

    await assert.rejects(() => command.execute(VALID_UUID_3, dto))
  })

  test('rejects empty update payloads before transaction work starts', async ({ assert }) => {
    const command = new UpdateTaskCommand(
      makeExecCtx(),
      taskExternalDeps,
      new NotificationStub(),
      new TaskCacheStub(),
      taskEvents
    )
    const dto = UpdateTaskDTO.fromPartialUpdate({ updated_by: VALID_UUID })

    await assert.rejects(
      () => command.execute(VALID_UUID_3, dto),
      /Không có thay đổi nào để cập nhật/
    )
  })

  test('delegates transaction persistence, then post-commit work, then reloads the task', async ({
    assert,
  }) => {
    const calls: string[] = []
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Renamed task' })
    const persistedTask = makeTask(VALID_UUID_3)
    const reloadedTask = makeTask(VALID_UUID)
    const trx = makeTransaction()
    const taskRepository = {
      findByIdWithDetailRecord: async (taskId) => {
        calls.push('reload')
        assert.equal(taskId, VALID_UUID_3)
        await Promise.resolve()
        return reloadedTask
      },
    } satisfies TaskDetailQueryRepositoryPort

    const command = new TestableUpdateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskUpdateWithinTransaction: async (input) => {
          calls.push('persist')
          assert.equal(input.execCtx.userId, VALID_UUID)
          assert.equal(input.taskId, VALID_UUID_3)
          assert.equal(input.dto, dto)
          assert.equal(input.userId, VALID_UUID)
          assert.equal(input.trx, trx)
          await Promise.resolve()
          return {
            task: persistedTask,
            oldAssignedTo: VALID_UUID_2,
            oldValues: { title: 'Old title' },
            changes: [{ field: 'title', oldValue: 'Old title', newValue: 'Renamed task' }],
          }
        },
        runUpdateTaskPostCommitEffects: async (updateResult, userId) => {
          calls.push('post')
          assert.equal(updateResult.task, persistedTask)
          assert.equal(userId, VALID_UUID)
          await Promise.resolve()
        },
        taskRepository,
      },
      trx
    )

    const result = await command.execute(VALID_UUID_3, dto)

    assert.equal(result, reloadedTask)
    assert.deepEqual(calls, ['persist', 'post', 'reload'])
  })

  test('reattaches authoring summary after reloading legacy Task detail', async ({ assert }) => {
    const summary = makeAuthoringSummary()
    const persistedTask = { ...makeTask(VALID_UUID_3), authoring: summary }
    const reloadedTask = makeTask(VALID_UUID_3)
    const dto = UpdateTaskDTO.fromPartialUpdate({
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotency_key: 'task-version:2',
        expected_head_revision: 1,
      },
    })
    const command = new TestableUpdateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskUpdateWithinTransaction: () =>
          Promise.resolve({
            task: persistedTask,
            oldAssignedTo: null,
            oldValues: {},
            changes: [],
          }),
        runUpdateTaskPostCommitEffects: () => Promise.resolve(),
        taskRepository: {
          findByIdWithDetailRecord: () => Promise.resolve(reloadedTask),
        },
      },
      makeTransaction()
    )

    const result = await command.execute(VALID_UUID_3, dto)

    assert.equal(result.authoring, summary)
  })

  test('returns the current Task on an idempotent authoring replay without post-commit effects', async ({
    assert,
  }) => {
    const calls: string[] = []
    const replaySummary = makeAuthoringSummary()
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Retried title' })
    const reloadedTask = makeTask(VALID_UUID_3)
    const command = new TestableUpdateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskUpdateWithinTransaction: () => {
          throw new TaskAuthoringIdempotentReplay(
            VALID_UUID_3,
            VALID_UUID_2,
            null,
            replaySummary
          )
        },
        runUpdateTaskPostCommitEffects: () => {
          calls.push('post')
          return Promise.resolve()
        },
        taskRepository: {
          findByIdWithDetailRecord: (taskId) => {
            calls.push(`reload:${taskId}`)
            return Promise.resolve(reloadedTask)
          },
        },
      },
      makeTransaction()
    )

    const result = await command.execute(VALID_UUID_3, dto)

    assert.notEqual(result, reloadedTask)
    assert.equal(result.authoring, replaySummary)
    assert.deepEqual(calls, [`reload:${VALID_UUID_3}`])
  })
})
