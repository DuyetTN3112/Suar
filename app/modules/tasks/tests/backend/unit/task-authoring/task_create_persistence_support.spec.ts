import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import type { AuditLogData } from '#modules/audit/public_contracts/audit_log_writer'
import { persistTaskCreateWithinTransaction } from '#modules/tasks/actions/commands/task-authoring/internal/create_task_transaction'
import CreateTaskDTO from '#modules/tasks/actions/dtos/request/task-authoring/create_task_dto'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskSprintReader } from '#modules/tasks/actions/ports/outbound/task_sprint_reader'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskRecord, TaskStatusRecord } from '#modules/tasks/types/task_records'

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
      required_skills: [{ id: VALID_UUID_4, level: 'l7' }],
      ...overrides,
    },
    {
      acceptance_criteria: 'Flow creates task and persists related records',
    }
  )
}

function makeDraftCreateTaskDTO(): CreateTaskDTO {
  return new CreateTaskDTO({
    title: 'Draft pre-order API brief',
    task_status_id: VALID_UUID_2,
    project_id: VALID_UUID_3,
    organization_id: VALID_UUID,
    authoring: {
      mode: 'evidence_enabled',
      intent: 'save_draft',
      idempotency_key: 'draft:pre-order-api:1',
      expected_head_revision: 0,
      creator_confirmed: false,
    },
  })
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

function makeExecCtx(): TaskActionContext {
  return {
    userId: VALID_UUID_2,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID,
  }
}

function makeTransaction(): TaskTransaction {
  return {}
}

function makeExternalDependencies(): TaskExternalDependencies {
  const sprint: TaskSprintReader = {
    findSprint: () => Promise.resolve(null),
    belongsToProject: () => Promise.resolve(false),
    validateAssignment: () => Promise.resolve({ allowed: true }),
    recordInitialAssignment: () => Promise.resolve(),
    recordAssignmentTransition: () => Promise.resolve(),
  }

  return {
    ...taskExternalDeps,
    sprint,
  }
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
        externalDependencies: makeExternalDependencies(),
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
        externalDependencies: makeExternalDependencies(),
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

  test('persists explicit authoring in the same transaction, skips missing Draft skills, and audits only safe metadata', async ({
    assert,
  }) => {
    const dto = makeDraftCreateTaskDTO()
    const trx = makeTransaction()
    const calls: string[] = []
    const auditCalls: AuditLogData[] = []
    const authoringSummary = {
      mode: 'evidence_enabled' as const,
      intent: 'save_draft' as const,
      specificationVersionId: VALID_UUID,
      contractVersionId: null,
      headRevision: 1,
      readiness: {
        policyVersion: 'suar.task-readiness.v1',
        workState: 'draft' as const,
        evidenceState: 'needs_clarification' as const,
        assignmentReady: false,
        evidenceReady: false,
        blockers: [
          {
            code: 'TVA.WORK.SPECIFICATION_MISSING',
            severity: 'blocker' as const,
            fieldPath: 'specification.plainText',
            sourcePath: null,
            message: 'Sensitive detailed message must not be copied into Task audit.',
            remediationHint: 'Sensitive remediation must not be copied into Task audit.',
          },
        ],
        warnings: [],
        assessedAt: '2026-08-01T10:00:00.000Z',
      },
      idempotencyKey: 'draft:pre-order-api:1',
      requestHash: `sha256:${'a'.repeat(64)}` as const,
    }
    const externalDependencies = {
      ...makeExternalDependencies(),
      authoring: {
        persistInitial: (input: { taskId: string; trx: TaskTransaction }) => {
          calls.push('authoring')
          assert.equal(input.taskId, VALID_UUID_4)
          assert.equal(input.trx, trx)
          return Promise.resolve(authoringSummary)
        },
        persistVersion: () => {
          throw new Error('Create flow must not persist a subsequent authoring version')
        },
      },
    }

    const createdTask = await persistTaskCreateWithinTransaction(
      {
        execCtx: makeExecCtx(),
        dto,
        userId: VALID_UUID_2,
        trx,
        externalDependencies,
      },
      {
        ensureTaskCreationPreconditions: () => Promise.resolve(),
        resolveTaskStatusForCreation: () => Promise.resolve(makeTaskStatus()),
        taskRepository: {
          create: () => {
            calls.push('create')
            return Promise.resolve({
              task: makeTaskRecord(),
              auditValues: { id: VALID_UUID_4, title: dto.title },
            })
          },
        },
        persistTaskRequiredSkills: () => {
          calls.push('skills')
          return Promise.resolve()
        },
        createAuditLogFactory: () => ({
          handle: (entry) => {
            calls.push('audit')
            auditCalls.push(entry)
            return Promise.resolve(true)
          },
        }),
      }
    )

    assert.deepEqual(calls, ['create', 'authoring', 'audit'])
    assert.deepEqual(createdTask.authoring, authoringSummary)
    assert.lengthOf(auditCalls, 1)
    assert.deepEqual(auditCalls[0]?.new_values, {
      id: VALID_UUID_4,
      title: dto.title,
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        specification_version_id: VALID_UUID,
        contract_version_id: null,
        head_revision: 1,
        policy_version: 'suar.task-readiness.v1',
        work_state: 'draft',
        evidence_state: 'needs_clarification',
        assignment_ready: false,
        evidence_ready: false,
        blocker_codes: ['TVA.WORK.SPECIFICATION_MISSING'],
        warning_codes: [],
      },
    })
    assert.notInclude(JSON.stringify(auditCalls), 'Sensitive detailed message')
    assert.notInclude(JSON.stringify(auditCalls), 'Sensitive remediation')
  })
})
