import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import CreateTaskCommand from '#modules/tasks/actions/commands/task-authoring/create_task_command'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskNotificationStager as NotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import type { TaskSearchProjectionInvalidationStager } from '#modules/tasks/actions/ports/outbound/task_search_projection_invalidation_stager'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { TaskAuthoringIdempotentReplay } from '#modules/tasks/domain/task-authoring/task_authoring_idempotency'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import type { TaskDetailRecord, TaskRecord } from '#modules/tasks/types/task_records'

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

class TestableCreateTaskCommand extends CreateTaskCommand {
  constructor(
    execCtx: TaskActionContext,
    createNotification: NotificationStager,
    dependencies: ConstructorParameters<typeof CreateTaskCommand>[5] & {
      taskRepository: {
        findByIdWithDetailRecord(taskId: string): Promise<TaskDetailRecord>
      }
      searchProjectionInvalidation?: TaskSearchProjectionInvalidationStager
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
      ...(dependencies.searchProjectionInvalidation ? { searchProjectionInvalidation: dependencies.searchProjectionInvalidation } : {}),
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

function makeCreateTaskDTO(): CreateTaskDTO {
  return CreateTaskDTO.fromCore(
    {
      title: 'Ship orchestration refactor',
      task_status_id: VALID_UUID_3,
      project_id: VALID_UUID_2,
      organization_id: VALID_UUID_2,
      required_skills: [{ id: VALID_UUID_3, level: 'l7' }],
    },
    {
      acceptance_criteria: 'Command delegates transaction and post-commit clearly',
    }
  )
}

function makeTaskRecord(id = VALID_UUID_3): TaskRecord {
  return {
    id,
    title: 'Ship orchestration refactor',
    description: 'Command delegates transaction and post-commit clearly',
    status: 'todo',
    task_status_id: VALID_UUID_3,
    priority: 'medium',
    assigned_to: null,
    creator_id: VALID_UUID,
    organization_id: VALID_UUID_2,
    project_id: VALID_UUID_2,
  }
}

function makeTaskDetailRecord(id = VALID_UUID_3): TaskDetailRecord {
  return makeTaskRecord(id)
}

function makeTransaction(): TaskTransaction {
  return {}
}

test.group('CreateTaskCommand shell orchestration', () => {
  test('requires an authenticated user before opening the orchestration flow', async ({
    assert,
  }) => {
    const command = new CreateTaskCommand(
      makeExecCtx(null),
      taskExternalDeps,
      new NotificationStub(),
      new TaskCacheStub(),
      taskEvents
    )

    await assert.rejects(() => command.execute(makeCreateTaskDTO()))
  })

  test('delegates transaction persistence, then post-commit work, then reloads the task', async ({
    assert,
  }) => {
    const calls: string[] = []
    const dto = makeCreateTaskDTO()
    const persistedTask = { ...makeTaskRecord(VALID_UUID_3), updated_at: '2026-08-09T00:00:00.000Z' }
    const reloadedTask = makeTaskDetailRecord(VALID_UUID)
    const trx = makeTransaction()

    const command = new TestableCreateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskCreateWithinTransaction: async (input) => {
          calls.push('persist')
          assert.equal(input.execCtx.userId, VALID_UUID)
          assert.equal(input.userId, VALID_UUID)
          assert.equal(input.dto, dto)
          assert.equal(input.trx, trx)
          await Promise.resolve()
          return persistedTask
        },
        runTaskCreatedPostCommitEffects: async (task, incomingDto, userId) => {
          calls.push('post')
          assert.equal(task, persistedTask)
          assert.equal(incomingDto, dto)
          assert.equal(userId, VALID_UUID)
          await Promise.resolve()
        },
        searchProjectionInvalidation: {
          stage: (input, transaction) => {
            calls.push('invalidation')
            assert.equal(input.taskId, VALID_UUID_3)
            assert.equal(input.operation, 'upsert')
            assert.equal(input.sourceRevision, '2026-08-09T00:00:00.000Z')
            assert.equal(transaction, trx)
            return Promise.resolve({ id: 'invalidation-1', staged: true })
          },
        },
        taskRepository: {
          findByIdWithDetailRecord: async (taskId) => {
            calls.push('reload')
            assert.equal(taskId, VALID_UUID_3)
            await Promise.resolve()
            return reloadedTask
          },
        },
      },
      trx
    )

    const result = await command.execute(dto)

    assert.equal(result, reloadedTask)
    assert.deepEqual(calls, ['persist', 'invalidation', 'post', 'reload'])
  })

  test('returns the transaction authoring/readiness summary after reloading legacy task detail', async ({
    assert,
  }) => {
    const dto = makeCreateTaskDTO()
    const authoring = {
      mode: 'evidence_enabled' as const,
      intent: 'publish' as const,
      specificationVersionId: VALID_UUID,
      contractVersionId: VALID_UUID_2,
      headRevision: 1,
      readiness: {
        policyVersion: 'suar.task-readiness.v1',
        workState: 'ready_to_assign' as const,
        evidenceState: 'evidence_ready' as const,
        assignmentReady: true,
        evidenceReady: true,
        blockers: [],
        warnings: [],
        assessedAt: '2026-08-01T10:00:00.000Z',
      },
      idempotencyKey: 'publish:task:1',
      requestHash: `sha256:${'a'.repeat(64)}` as const,
    }
    const persistedTask = { ...makeTaskRecord(VALID_UUID_3), authoring }
    const reloadedTask = makeTaskDetailRecord(VALID_UUID_3)
    const command = new TestableCreateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskCreateWithinTransaction: () => Promise.resolve(persistedTask),
        runTaskCreatedPostCommitEffects: () => Promise.resolve(),
        taskRepository: {
          findByIdWithDetailRecord: () => Promise.resolve(reloadedTask),
        },
      },
      makeTransaction()
    )

    const result = await command.execute(dto)

    assert.notEqual(result, reloadedTask)
    assert.deepEqual(result.authoring, authoring)
    assert.equal(result.id, reloadedTask.id)
  })

  test('returns the original Task on an idempotent create replay without repeating post-commit effects', async ({
    assert,
  }) => {
    const calls: string[] = []
    const originalTask = makeTaskDetailRecord(VALID_UUID)
    const replaySummary = {
      mode: 'evidence_enabled' as const,
      intent: 'save_draft' as const,
      specificationVersionId: VALID_UUID_2,
      contractVersionId: null,
      headRevision: 1,
      readiness: {
        policyVersion: 'suar.task-readiness.v1',
        workState: 'draft' as const,
        evidenceState: 'needs_clarification' as const,
        assignmentReady: false,
        evidenceReady: false,
        blockers: [],
        warnings: [],
        assessedAt: '2026-08-01T10:00:00.000Z',
      },
      idempotencyKey: 'draft:replay:1',
      requestHash: `sha256:${'b'.repeat(64)}` as const,
    }
    const command = new TestableCreateTaskCommand(
      makeExecCtx(),
      new NotificationStub(),
      {
        persistTaskCreateWithinTransaction: () => {
          calls.push('persist')
          return Promise.reject(
            new TaskAuthoringIdempotentReplay(
              VALID_UUID,
              VALID_UUID_2,
              null,
              replaySummary
            )
          )
        },
        runTaskCreatedPostCommitEffects: () => {
          calls.push('post')
          return Promise.resolve()
        },
        taskRepository: {
          findByIdWithDetailRecord: (taskId) => {
            calls.push('reload')
            assert.equal(taskId, VALID_UUID)
            return Promise.resolve(originalTask)
          },
        },
      },
      makeTransaction()
    )

    const result = await command.execute(makeCreateTaskDTO())

    assert.notEqual(result, originalTask)
    assert.deepEqual(result.authoring, replaySummary)
    assert.deepEqual(calls, ['persist', 'reload'])
  })
})
