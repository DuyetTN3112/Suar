import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import UpdateTaskDTO from '#actions/tasks/dtos/request/update_task_dto'
import { persistTaskUpdateWithinTransaction } from '#actions/tasks/support/update_task_persistence_support'
import { SystemRoleName } from '#modules/users/constants/user_constants'
import type { ExecutionContext } from '#types/execution_context'
import type { TaskRecord } from '#types/task_records'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'
const VALID_UUID_3 = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f'

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: VALID_UUID,
    title: 'Old title',
    description: 'Old description',
    status: 'in_progress',
    task_status_id: null,
    label: 'feature',
    priority: 'high',
    difficulty: 'medium',
    assigned_to: VALID_UUID_2,
    due_date: DateTime.fromISO('2026-04-20T00:00:00.000Z').toISO(),
    parent_task_id: null,
    estimated_time: 8,
    actual_time: 3,
    organization_id: VALID_UUID,
    project_id: VALID_UUID_3,
    creator_id: VALID_UUID_3,
    task_visibility: 'public',
    updated_by: null,
    ...overrides,
  }
}

function makeExecCtx(): ExecutionContext {
  return {
    userId: VALID_UUID_3,
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

  return trx as unknown as TransactionClientContract
}

test.group('Update task persistence support', () => {
  test('persists changes, audit log, and version snapshot for tracked updates', async ({ assert }) => {
    const task = makeTask()
    const updateCalls: Record<string, unknown>[] = []
    const auditCalls: {
      action: string
      entity_type: string
      entity_id: string
      old_values?: unknown
      new_values?: unknown
    }[] = []
    const snapshotCalls: {
      task_id: string
      title: string
      changed_by: string
    }[] = []
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Updated title' })

    const result = await persistTaskUpdateWithinTransaction(
      {
        execCtx: makeExecCtx(),
        taskId: VALID_UUID,
        dto,
        userId: VALID_UUID_3,
        trx: makeTransaction(),
      },
      {
        taskRepository: {
          findActiveForUpdateAsRecord: () => Promise.resolve(task),
          updateTask: (_taskId, data) => {
            updateCalls.push(data)
            return Promise.resolve({ ...task, ...data })
          },
        },
        projectReader: {
          ensureProjectBelongsToOrganization: () => Promise.resolve(),
        },
        orgReader: {
          isApprovedMember: () => Promise.resolve(true),
        },
        userReader: {
          isFreelancer: () => Promise.resolve(false),
        },
        taskVersionRepository: {
          createSnapshot: (taskId, snapshot, changedBy) => {
            snapshotCalls.push({
              task_id: taskId,
              title: snapshot.title as string,
              changed_by: changedBy,
            })
            return Promise.resolve()
          },
        },
        createAuditLogFactory: () => ({
          handle: (entry) => {
            auditCalls.push(entry)
            return Promise.resolve(true)
          },
        }),
        buildTaskPermissionContext: () =>
          Promise.resolve({
            actorId: VALID_UUID_3,
            actorSystemRole: SystemRoleName.SUPERADMIN,
            actorOrgRole: null,
            actorProjectRole: null,
            taskCreatorId: VALID_UUID_3,
            taskAssignedTo: VALID_UUID_2,
            taskOrganizationId: VALID_UUID,
            taskProjectId: VALID_UUID_3,
            isActiveAssignee: false,
          }),
      }
    )

    assert.equal(result.task.title, 'Updated title')
    assert.equal(result.oldAssignedTo, VALID_UUID_2)
    assert.deepEqual(result.changes, [
      {
        field: 'title',
        oldValue: 'Old title',
        newValue: 'Updated title',
      },
    ])
    assert.lengthOf(updateCalls, 1)
    assert.lengthOf(auditCalls, 1)
    assert.lengthOf(snapshotCalls, 1)
    assert.deepInclude(auditCalls[0], {
      action: 'update',
      entity_type: 'task',
      entity_id: VALID_UUID,
    })
    assert.deepInclude(snapshotCalls[0], {
      task_id: VALID_UUID,
      title: 'Old title',
      changed_by: VALID_UUID_3,
    })
  })

  test('rejects tasks outside the current organization before persisting', async ({ assert }) => {
    const task = makeTask({ organization_id: VALID_UUID_2 })
    const updateCalls: Record<string, unknown>[] = []
    const dto = UpdateTaskDTO.fromPartialUpdate({ title: 'Updated title' })

    await assert.rejects(
      () =>
        persistTaskUpdateWithinTransaction(
          {
            execCtx: makeExecCtx(),
            taskId: VALID_UUID,
            dto,
            userId: VALID_UUID_3,
            trx: makeTransaction(),
          },
          {
            taskRepository: {
              findActiveForUpdateAsRecord: () => Promise.resolve(task),
              updateTask: (_taskId, data) => {
                updateCalls.push(data)
                return Promise.resolve({ ...task, ...data })
              },
            },
            projectReader: {
              ensureProjectBelongsToOrganization: () => Promise.resolve(),
            },
            orgReader: {
              isApprovedMember: () => Promise.resolve(true),
            },
            userReader: {
              isFreelancer: () => Promise.resolve(false),
            },
            taskVersionRepository: {
              createSnapshot: () => Promise.resolve(),
            },
            createAuditLogFactory: () => ({
              handle: () => Promise.resolve(true),
            }),
            buildTaskPermissionContext: () =>
              Promise.resolve({
                actorId: VALID_UUID_3,
                actorSystemRole: SystemRoleName.SUPERADMIN,
                actorOrgRole: null,
                actorProjectRole: null,
                taskCreatorId: VALID_UUID_3,
                taskAssignedTo: VALID_UUID_2,
                taskOrganizationId: VALID_UUID_2,
                taskProjectId: VALID_UUID_3,
                isActiveAssignee: false,
              }),
          }
        ),
      /Task không thuộc tổ chức hiện tại/
    )

    assert.lengthOf(updateCalls, 0)
  })
})
