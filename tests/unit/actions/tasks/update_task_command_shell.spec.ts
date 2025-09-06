import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import type { NotificationCreator } from '#modules/notifications/public_contracts/notification_creator'
import UpdateTaskCommand from '#modules/tasks/actions/commands/update_task_command'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskCachePort } from '#modules/tasks/actions/ports/task_cache_port'
import type { TaskDetailQueryRepositoryPort } from '#modules/tasks/actions/ports/task_query_repository_port'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import type { TaskRecord } from '#modules/tasks/types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

class NotificationStub implements NotificationCreator {
  async handle() {
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
  invalidateTaskDetail() {
    return resolvedVoid()
  }
}

class TestableUpdateTaskCommand extends UpdateTaskCommand {
  constructor(
    execCtx: TaskActionContext,
    createNotification: NotificationCreator,
    dependencies: ConstructorParameters<typeof UpdateTaskCommand>[4],
    private trx: TransactionClientContract
  ) {
    super(execCtx, taskExternalDeps, createNotification, new TaskCacheStub(), dependencies)
  }

  protected override async executeInTransaction<T>(
    callback: (trx: TransactionClientContract) => Promise<T>
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

function makeTransaction(): TransactionClientContract {
  const trx = {
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
  }

  // @ts-expect-error - partial transaction client mock for unit tests
  return trx
}

test.group('UpdateTaskCommand shell orchestration', () => {
  test('requires an authenticated user before updating a task', async ({ assert }) => {
    const command = new UpdateTaskCommand(
      makeExecCtx(null),
      taskExternalDeps,
      new NotificationStub(),
      new TaskCacheStub()
    )
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Renamed task' })

    await assert.rejects(() => command.execute(VALID_UUID_3, dto))
  })

  test('rejects empty update payloads before transaction work starts', async ({ assert }) => {
    const command = new UpdateTaskCommand(
      makeExecCtx(),
      taskExternalDeps,
      new NotificationStub(),
      new TaskCacheStub()
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
        runUpdateTaskPostCommitEffects: async (updateResult, userId, incomingDto) => {
          calls.push('post')
          assert.equal(updateResult.task, persistedTask)
          assert.equal(userId, VALID_UUID)
          assert.equal(incomingDto, dto)
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
})
