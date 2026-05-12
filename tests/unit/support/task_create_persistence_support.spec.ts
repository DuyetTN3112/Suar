import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CreateTaskDTO from '#actions/tasks/dtos/request/create_task_dto'
import { persistTaskCreateWithinTransaction } from '#actions/tasks/support/task_create_persistence_support'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord, TaskStatusRecord } from '#types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'
const VALID_UUID_4 = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a'

function makeCreateTaskDTO(overrides: Record<string, unknown> = {}): CreateTaskDTO {
  return CreateTaskDTO.fromCore(
    {
      title: 'Refactor task creation flow',
      task_status_id: VALID_UUID_2,
      project_id: VALID_UUID_3,
      organization_id: VALID_UUID,
      required_skills: [{ id: VALID_UUID_4, level: 'middle' }],
      ...overrides,
    },
    {
      acceptance_criteria: 'Flow creates task and persists related records',
    }
  )
}

function makeTaskRecord(overrides: Record<string, unknown> = {}): TaskRecord {
  return {
    id: VALID_UUID_4,
    title: 'Refactor task creation flow',
    description: 'Flow creates task and persists related records',
    status: 'todo',
    task_status_id: VALID_UUID_2,
    priority: 'medium',
    assigned_to: null,
    creator_id: VALID_UUID_3,
    organization_id: VALID_UUID,
    project_id: VALID_UUID_3,
    ...overrides,
  }
}

function makeTaskStatus(overrides: Record<string, unknown> = {}): TaskStatusRecord {
  return {
    id: VALID_UUID_2,
    organization_id: VALID_UUID,
    name: 'Todo',
    slug: 'todo',
    color: '#000000',
    category: 'todo',
    icon: null,
    description: null,
    sort_order: 0,
    is_default: true,
    is_system: true,
    ...overrides,
  }
}

function makeExecCtx(): ExecutionContext {
  return {
    userId: VALID_UUID_2,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID,
  }
}

function makeTransaction(): TransactionClientContract {
  const trx = {
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
  }

  // @ts-expect-error - partial transaction client mock for unit tests
  return trx
}

test.group('Task create persistence support', () => {
  test('persists task creation flow in transaction and applies the default due date', async ({
    assert,
  }) => {
    const dto = makeCreateTaskDTO()
    const calls: string[] = []
    const auditCalls: unknown[] = []
    const requiredSkillCalls: unknown[] = []
    const now = DateTime.fromISO('2026-04-12T00:00:00.000Z')

    const createdTask = await persistTaskCreateWithinTransaction(
      {
        execCtx: makeExecCtx(),
        dto,
        userId: VALID_UUID_2,
        trx: makeTransaction(),
      },
      {
        ensureTaskCreationPreconditions: async (userId, incomingDto) => {
          calls.push('preconditions')
          assert.equal(userId, VALID_UUID_2)
          assert.equal(incomingDto, dto)
          await Promise.resolve()
        },
        resolveTaskStatusForCreation: async (incomingDto) => {
          calls.push('status')
          assert.equal(incomingDto, dto)
          await Promise.resolve()
          return makeTaskStatus()
        },
        taskRepository: {
          create: async (payload) => {
            calls.push('create')
            assert.equal(payload.creator_id, VALID_UUID_2)
            assert.equal(payload.organization_id, VALID_UUID)
            assert.equal(payload.project_id, VALID_UUID_3)
            if (!DateTime.isDateTime(payload.due_date)) {
              throw new Error('Expected a normalized due date')
            }
            assert.equal(payload.due_date.toISO(), now.plus({ days: 7 }).toISO())
            await Promise.resolve()
            const task = makeTaskRecord({
              title: payload.title,
              creator_id: payload.creator_id,
              organization_id: payload.organization_id,
              project_id: payload.project_id,
            })
            return {
              task,
              auditValues: {
                id: task.id,
                title: task.title,
              },
            }
          },
        },
        persistTaskRequiredSkills: async (taskId, requiredSkills) => {
          calls.push('skills')
          requiredSkillCalls.push({ taskId, requiredSkills })
          await Promise.resolve()
        },
        createAuditLogFactory: () => ({
          handle: async (entry) => {
            calls.push('audit')
            auditCalls.push(entry)
            await Promise.resolve()
            return true
          },
        }),
        getNow: () => now,
      }
    )

    assert.equal(createdTask.id, VALID_UUID_4)
    assert.deepEqual(calls, ['preconditions', 'status', 'create', 'skills', 'audit'])
    assert.lengthOf(requiredSkillCalls, 1)
    assert.lengthOf(auditCalls, 1)
    assert.deepInclude(requiredSkillCalls[0], {
      taskId: VALID_UUID_4,
      requiredSkills: dto.required_skills,
    })
    assert.deepInclude(auditCalls[0], {
      user_id: VALID_UUID_2,
      action: 'create',
      entity_type: 'task',
      entity_id: VALID_UUID_4,
    })
    assert.deepInclude(auditCalls[0], {
      new_values: {
        id: VALID_UUID_4,
        title: 'Refactor task creation flow',
      },
    })
  })

  test('respects an explicit due date instead of forcing the default window', async ({ assert }) => {
    const explicitDueDate = DateTime.fromISO('2026-05-01T00:00:00.000Z')
    const dto = makeCreateTaskDTO({ due_date: explicitDueDate })
    let persistedDueDateIso: string | null = null

    await persistTaskCreateWithinTransaction(
      {
        execCtx: makeExecCtx(),
        dto,
        userId: VALID_UUID_2,
        trx: makeTransaction(),
      },
      {
        ensureTaskCreationPreconditions: () => Promise.resolve(),
        resolveTaskStatusForCreation: () => Promise.resolve(makeTaskStatus()),
        taskRepository: {
          create: (payload) => {
            const dueDate = payload.due_date
            if (DateTime.isDateTime(dueDate)) {
              persistedDueDateIso = dueDate.toISO()
            }
            const task = makeTaskRecord({
              title: payload.title,
              creator_id: payload.creator_id,
              organization_id: payload.organization_id,
              project_id: payload.project_id,
            })
            return Promise.resolve({
              task,
              auditValues: {
                id: task.id,
                title: task.title,
              },
            })
          },
        },
        persistTaskRequiredSkills: () => Promise.resolve(),
        createAuditLogFactory: () => ({
          handle: () => Promise.resolve(true),
        }),
      }
    )

    assert.equal(persistedDueDateIso, explicitDueDate.toISO())
  })
})
