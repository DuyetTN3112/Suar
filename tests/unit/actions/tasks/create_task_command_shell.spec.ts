import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import CreateNotification from '#actions/common/create_notification'
import CreateTaskCommand from '#actions/tasks/commands/create_task_command'
import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import type Task from '#models/task'
import type { ExecutionContext } from '#types/execution_context'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

class NotificationStub extends CreateNotification {
  override async handle() {
    return await Promise.resolve(null)
  }
}

class TestableCreateTaskCommand extends CreateTaskCommand {
  constructor(
    execCtx: ExecutionContext,
    createNotification: CreateNotification,
    dependencies: ConstructorParameters<typeof CreateTaskCommand>[2],
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

function makeCreateTaskDTO(): CreateTaskDTO {
  return CreateTaskDTO.fromCore(
    {
      title: 'Ship orchestration refactor',
      task_status_id: VALID_UUID_3,
      project_id: VALID_UUID_2,
      organization_id: VALID_UUID_2,
      required_skills: [{ id: VALID_UUID_3, level: 'middle' }],
    },
    {
      acceptance_criteria: 'Command delegates transaction and post-commit clearly',
    }
  )
}

function makeTask(id = VALID_UUID_3): Task {
  const task = {
    id,
    title: 'Ship orchestration refactor',
    toJSON() {
      return { id, title: 'Ship orchestration refactor' }
    },
  }

  // @ts-expect-error - partial Lucid model mock for unit tests
  return task
}

function makeTransaction(): TransactionClientContract {
  const trx = {
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
  }

  // @ts-expect-error - partial transaction client mock for unit tests
  return trx
}

test.group('CreateTaskCommand shell orchestration', () => {
  test('requires an authenticated user before opening the orchestration flow', async ({
    assert,
  }) => {
    const command = new CreateTaskCommand(makeExecCtx(null), new NotificationStub())

    await assert.rejects(() => command.execute(makeCreateTaskDTO()))
  })

  test('delegates transaction persistence, then post-commit work, then reloads the task', async ({
    assert,
  }) => {
    const calls: string[] = []
    const dto = makeCreateTaskDTO()
    const persistedTask = makeTask(VALID_UUID_3)
    const reloadedTask = makeTask(VALID_UUID)
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
        taskRepository: {
          findByIdWithDetailRelations: async (taskId) => {
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
    assert.deepEqual(calls, ['persist', 'post', 'reload'])
  })
})
