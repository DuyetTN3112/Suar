import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import { persistTaskUpdateWithinTransaction } from '#modules/tasks/actions/commands/internal/update_task_transaction'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskRecord } from '#modules/tasks/types/task_records'

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
    task_visibility: 'internal',
    updated_by: null,
    ...overrides,
  }
}

function makeExecCtx(): TaskActionContext {
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
  test('persists an authoring-only version without a fake Task-row update and audits metadata only', async ({
    assert,
  }) => {
    const task = makeTask({ assigned_to: null })
    const dto = UpdateTaskDTO.fromPartialUpdate({
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotency_key: 'task-version:pre-order:2',
        expected_head_revision: 1,
        creator_confirmed: false,
        specification: {
          plain_text: 'SECRET specification content must not enter the audit log.',
        },
      },
    })
    const authoringCalls: Array<{
      taskId: string
      actorId: string
      subject: Record<string, unknown>
    }> = []
    const auditValues: Record<string, unknown>[] = []
    const readiness = {
      policyVersion: 'suar.task-readiness.v1',
      workState: 'draft' as const,
      evidenceState: 'needs_clarification' as const,
      assignmentReady: false,
      evidenceReady: false,
      blockers: [
        {
          code: 'TVA.WORK.ACTION_MISSING',
          severity: 'blocker' as const,
          fieldPath: 'work.action',
          sourcePath: null,
          message: 'SECRET readiness explanation',
          remediationHint: 'SECRET remediation',
        },
      ],
      warnings: [],
      assessedAt: '2026-08-01T10:00:00.000Z',
    }
    const lifecycle = Object.assign(Object.create(taskExternalDeps.lifecycle), {
      lockActiveTask: () => Promise.resolve(task),
      updateTask: () => {
        throw new Error('Authoring-only update must not write the legacy Task row')
      },
    })
    const assignments = Object.assign(Object.create(taskExternalDeps.assignments), {
      findActiveByTask: () => Promise.resolve(null),
    })

    const result = await persistTaskUpdateWithinTransaction(
      {
        execCtx: makeExecCtx(),
        taskId: VALID_UUID,
        dto,
        userId: VALID_UUID_3,
        trx: makeTransaction(),
        externalDependencies: {
          ...taskExternalDeps,
          lifecycle,
          assignments,
          authoring: {
            persistInitial: () => {
              throw new Error('Update must not persist an initial authoring bundle')
            },
            persistVersion: (input) => {
              authoringCalls.push({
                taskId: input.taskId,
                actorId: input.actorId,
                subject: input.dto.toObject(),
              })
              return Promise.resolve({
                mode: 'evidence_enabled',
                intent: 'save_draft',
                specificationVersionId: VALID_UUID_2,
                contractVersionId: null,
                headRevision: 2,
                readiness,
                idempotencyKey: 'task-version:pre-order:2',
                requestHash: `sha256:${'a'.repeat(64)}`,
              })
            },
          },
        },
      },
      {
        taskRepository: {
          lockActiveTask: () => Promise.resolve(task),
          updateTask: () => {
            throw new Error('Authoring-only update must not write the legacy Task row')
          },
        },
        projectReader: {
          ensureProjectBelongsToOrganization: () => Promise.resolve(),
        },
        orgReader: {
          isApprovedMember: () => Promise.resolve(true),
        },
        userReader: {
          isExternalContributor: () => Promise.resolve(false),
        },
        reviewReader: {
          hasAnyReviewForTask: () => Promise.resolve(false),
          hasTaskReviewWorkflow: () => Promise.resolve(false),
        },
        taskVersionRepository: {
          createSnapshot: () => {
            throw new Error('Authoring-only update must not create a legacy TaskVersion snapshot')
          },
        },
        createAuditLogFactory: () => ({
          handle: (entry) => {
            auditValues.push((entry.new_values ?? {}) as Record<string, unknown>)
            return Promise.resolve(true)
          },
        }),
        buildTaskPermissionContext: () =>
          Promise.resolve({
            actorId: VALID_UUID_3,
            actorOrgRole: null,
            actorProjectRole: null,
            taskCreatorId: VALID_UUID_3,
            taskAssignedTo: null,
            taskOrganizationId: VALID_UUID,
            taskProjectId: VALID_UUID_3,
            taskVisibility: 'internal',
            isActiveAssignee: false,
          }),
      }
    )

    assert.equal(result.task.authoring?.headRevision, 2)
    assert.lengthOf(authoringCalls, 1)
    assert.deepInclude(authoringCalls[0]?.subject, {
      title: 'Old title',
      organization_id: VALID_UUID,
      project_id: VALID_UUID_3,
    })
    const serializedAudit = JSON.stringify(auditValues)
    assert.include(serializedAudit, 'TVA.WORK.ACTION_MISSING')
    assert.notInclude(serializedAudit, 'SECRET')
  })

  test('persists changes, audit log, and version snapshot for tracked updates', async ({
    assert,
  }) => {
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
        externalDependencies: taskExternalDeps,
      },
      {
        taskRepository: {
          lockActiveTask: () => Promise.resolve(task),
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
          isExternalContributor: () => Promise.resolve(false),
        },
        reviewReader: {
          hasAnyReviewForTask: () => Promise.resolve(false),
          hasTaskReviewWorkflow: () => Promise.resolve(false),
        },
        taskVersionRepository: {
          createSnapshot: (taskId, snapshot, changedBy) => {
            snapshotCalls.push({
              task_id: taskId,
              title: snapshot['title'] as string,
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
            actorOrgRole: null,
            actorProjectRole: null,
            taskCreatorId: VALID_UUID_3,
            taskAssignedTo: VALID_UUID_2,
            taskOrganizationId: VALID_UUID,
            taskProjectId: VALID_UUID_3,
            taskVisibility: 'internal',
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
            externalDependencies: taskExternalDeps,
          },
          {
            taskRepository: {
              lockActiveTask: () => Promise.resolve(task),
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
              isExternalContributor: () => Promise.resolve(false),
            },
            reviewReader: {
              hasAnyReviewForTask: () => Promise.resolve(false),
              hasTaskReviewWorkflow: () => Promise.resolve(false),
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
                actorOrgRole: null,
                actorProjectRole: null,
                taskCreatorId: VALID_UUID_3,
                taskAssignedTo: VALID_UUID_2,
                taskOrganizationId: VALID_UUID_2,
                taskProjectId: VALID_UUID_3,
                taskVisibility: 'internal',
                isActiveAssignee: false,
              }),
          }
        ),
      /Task không thuộc tổ chức hiện tại/
    )

    assert.lengthOf(updateCalls, 0)
  })

  test('uses updated task visibility when validating external contributor reassignment', async ({
    assert,
  }) => {
    const task = makeTask({ task_visibility: 'external' })
    const dto = UpdateTaskDTO.fromPartialUpdate({
      task_visibility: 'internal',
      assigned_to: VALID_UUID_2,
    })
    const updateCalls: Record<string, unknown>[] = []

    await assert.rejects(
      () =>
        persistTaskUpdateWithinTransaction(
          {
            execCtx: makeExecCtx(),
            taskId: VALID_UUID,
            dto,
            userId: VALID_UUID_3,
            trx: makeTransaction(),
            externalDependencies: taskExternalDeps,
          },
          {
            taskRepository: {
              lockActiveTask: () => Promise.resolve(task),
              updateTask: (_taskId, data) => {
                updateCalls.push(data)
                return Promise.resolve({ ...task, ...data })
              },
            },
            projectReader: {
              ensureProjectBelongsToOrganization: () => Promise.resolve(),
            },
            orgReader: {
              isApprovedMember: () => Promise.resolve(false),
            },
            userReader: {
              isExternalContributor: () => Promise.resolve(true),
            },
            reviewReader: {
              hasAnyReviewForTask: () => Promise.resolve(false),
              hasTaskReviewWorkflow: () => Promise.resolve(false),
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
                actorOrgRole: null,
                actorProjectRole: null,
                taskCreatorId: VALID_UUID_3,
                taskAssignedTo: VALID_UUID_2,
                taskOrganizationId: VALID_UUID,
                taskProjectId: VALID_UUID_3,
                taskVisibility: 'internal',
                isActiveAssignee: false,
              }),
          }
        ),
      /Contributor bên ngoài chỉ có thể được giao/
    )

    assert.lengthOf(updateCalls, 0)
  })
})
