import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import type { NotificationCreator } from '#actions/notifications/public_api'
import UpdateTaskCommand from '#actions/tasks/commands/update_task_command'
import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import type { TaskDetailQueryRepositoryPort } from '#actions/tasks/ports/task_query_repository_port'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord } from '#types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

class NotificationStub implements NotificationCreator {
  async handle() {
    return await Promise.resolve(null)
  }
}

class TestableUpdateTaskCommand extends UpdateTaskCommand {
  constructor(
    execCtx: ExecutionContext,
    createNotification: NotificationCreator,
    dependencies: ConstructorParameters<typeof UpdateTaskCommand>[2],
    private trx: TransactionClientContract
  ) {
    super(execCtx, createNotification, dependencies)
  }

  protected override async executeInTransaction<T>(
    callback: (trx: TransactionClientContract) => Promise<T>
  ): Promise<T> {
    return await callback(this.trx)
  }
}

function makeExecCtx(userId: string | null = VALID_UUID): ExecutionContext {
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
    const command = new UpdateTaskCommand(makeExecCtx(null), new NotificationStub())
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Renamed task' })

    await assert.rejects(() => command.execute(VALID_UUID_3, dto))
  })

  test('rejects empty update payloads before transaction work starts', async ({ assert }) => {
    const command = new UpdateTaskCommand(makeExecCtx(), new NotificationStub())
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
