import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { synchronizeTaskAssignment } from '#modules/tasks/actions/commands/internal/synchronize_task_assignment'
import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskLifecycleRepository } from '#modules/tasks/actions/ports/outbound/task_lifecycle_repository'
import { TaskSkillReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

const TASK_ID = '11111111-1111-4111-8111-111111111111'
const ACTOR_ID = '22222222-2222-4222-8222-222222222222'
const ASSIGNEE_A = '33333333-3333-4333-8333-333333333333'
const ASSIGNEE_B = '44444444-4444-4444-8444-444444444444'

interface AssignmentHarness {
  activeAssigneeId: string | null
  calls: string[]
  assignmentRepository: TaskAssignmentRepository
  taskRepository: TaskLifecycleRepository
  skillReader: TaskSkillReader
  transaction: TaskTransaction
}

function makeHarness(activeAssigneeId: string | null = null): AssignmentHarness {
  const calls: string[] = []
  const transaction: TaskTransaction = {}
  const assignmentRepository = {
    findActiveByTask: (taskId: string, trx?: TaskTransaction) => {
      calls.push(`find:${taskId}:${trx === transaction}`)
      return Promise.resolve(
        activeAssigneeId
          ? {
              id: 'active-assignment',
              task_id: TASK_ID,
              assignee_id: activeAssigneeId,
              assigned_by: ACTOR_ID,
              assigned_at: '2026-08-01T00:00:00.000Z',
              assignment_status: 'active' as const,
            }
          : null
      )
    },
    create: (data: { assignee_id: string }, trx?: TaskTransaction) => {
      calls.push(`create:${data.assignee_id}:${trx === transaction}`)
      return Promise.resolve({
        id: 'new-assignment',
        task_id: TASK_ID,
        assignee_id: data.assignee_id,
        assigned_by: ACTOR_ID,
        assigned_at: '2026-08-01T00:00:00.000Z',
        assignment_status: 'active' as const,
      })
    },
    cancel: (assignmentId: string, _notes: string, trx?: TaskTransaction) => {
      calls.push(`cancel:${assignmentId}:${trx === transaction}`)
      return Promise.resolve()
    },
  } as unknown as TaskAssignmentRepository
  const taskRepository = {
    lockActiveTask: (taskId: string, trx: TaskTransaction) => {
      calls.push(`lock:${taskId}:${trx === transaction}`)
      return Promise.resolve({ task_status_id: null })
    },
    updateTask: (
      taskId: string,
      data: Record<string, unknown>,
      trx: TaskTransaction
    ) => {
      calls.push(`task:${taskId}:${String(data['assigned_to'])}:${trx === transaction}`)
      return Promise.resolve()
    },
  } as unknown as TaskLifecycleRepository

  return {
    activeAssigneeId,
    calls,
    assignmentRepository,
    taskRepository,
    skillReader: new (class extends TaskSkillReader {
      listActiveSkills = async () => []
      listProjectTaskSkills = async () => []
      listActiveProficiencyLevels = async () => []
      findActiveSkillIds = async () => []
      findSkillSummariesByIds = async () => []
      resolveSkillIdsByCategoryCodes = async () => []
      findTaskRequirementReferenceFacts = async () => ({ skills: [], proficiencyLevels: [] })
      findProficiencyLevelsByIds = async () => []
      findProficiencyLevelById = async () => null
      findRubricVersion = async () => null
      findProjectRole = async () => null
    })(),
    transaction,
  }
}

test.group('Synchronize task assignment', () => {
  test('creates the active assignment and updates the task assignee through the same transaction', async ({
    assert,
  }) => {
    const harness = makeHarness()

    const assignment = await synchronizeTaskAssignment(
      { taskId: TASK_ID, assigneeId: ASSIGNEE_A, assignedBy: ACTOR_ID },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      `create:${ASSIGNEE_A}:true`,
      `task:${TASK_ID}:${ASSIGNEE_A}:true`,
    ])
    assert.deepInclude(assignment, {
      id: 'new-assignment',
      task_id: TASK_ID,
      assignee_id: ASSIGNEE_A,
    })
  })

  test('keeps one active assignment when synchronizing the same assignee', async ({ assert }) => {
    const harness = makeHarness(ASSIGNEE_A)

    const assignment = await synchronizeTaskAssignment(
      { taskId: TASK_ID, assigneeId: ASSIGNEE_A, assignedBy: ACTOR_ID },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      `task:${TASK_ID}:${ASSIGNEE_A}:true`,
    ])
    assert.equal(assignment?.id, 'active-assignment')
  })

  test('cancels the old active assignment before creating the replacement', async ({ assert }) => {
    const harness = makeHarness(ASSIGNEE_A)

    const assignment = await synchronizeTaskAssignment(
      { taskId: TASK_ID, assigneeId: ASSIGNEE_B, assignedBy: ACTOR_ID },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      'cancel:active-assignment:true',
      `create:${ASSIGNEE_B}:true`,
      `task:${TASK_ID}:${ASSIGNEE_B}:true`,
    ])
    assert.equal(assignment?.assignee_id, ASSIGNEE_B)
  })

  test('cancels the active assignment and clears the task cache on unassign', async ({ assert }) => {
    const harness = makeHarness(ASSIGNEE_A)

    const assignment = await synchronizeTaskAssignment(
      { taskId: TASK_ID, assigneeId: null, assignedBy: ACTOR_ID },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      'cancel:active-assignment:true',
      `task:${TASK_ID}:null:true`,
    ])
    assert.isNull(assignment)
  })

  test('does not write the task row twice when the caller already persisted assigned_to', async ({
    assert,
  }) => {
    const harness = makeHarness(ASSIGNEE_A)

    await synchronizeTaskAssignment(
      {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_B,
        assignedBy: ACTOR_ID,
        taskRowAlreadySynchronized: true,
      },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      'cancel:active-assignment:true',
      `create:${ASSIGNEE_B}:true`,
    ])
  })

  test('refuses to assign a user who is below a mandatory task skill level', async ({ assert }) => {
    const harness = makeHarness()
    harness.skillReader.getTaskSkillEligibility = async () => ({
      isEligible: false,
      unmetRequirements: [
        {
          skillId: 'skill-svelte',
          skillName: 'Svelte',
          requiredLevel: 'l4',
          actualLevel: 'l3',
        },
      ],
    })

    await assert.rejects(
      () =>
        synchronizeTaskAssignment(
          { taskId: TASK_ID, assigneeId: ASSIGNEE_A, assignedBy: ACTOR_ID },
          harness.transaction,
          harness.assignmentRepository,
          harness.taskRepository,
          harness.skillReader
        ),
      ValidationException
    )
    assert.deepEqual(harness.calls, [`lock:${TASK_ID}:true`])
  })

  test('allows a direct assignment below the task minimum when explicitly overridden', async ({ assert }) => {
    const harness = makeHarness()
    harness.skillReader.getTaskSkillEligibility = async () => ({
      isEligible: false,
      unmetRequirements: [
        {
          skillId: 'skill-svelte',
          skillName: 'Svelte',
          requiredLevel: 'l4',
          actualLevel: 'l3',
        },
      ],
    })

    const assignment = await synchronizeTaskAssignment(
      {
        taskId: TASK_ID,
        assigneeId: ASSIGNEE_A,
        assignedBy: ACTOR_ID,
        enforceSkillEligibility: false,
      },
      harness.transaction,
      harness.assignmentRepository,
      harness.taskRepository,
      harness.skillReader
    )

    assert.equal(assignment?.assignee_id, ASSIGNEE_A)
    assert.deepEqual(harness.calls, [
      `lock:${TASK_ID}:true`,
      `find:${TASK_ID}:true`,
      `create:${ASSIGNEE_A}:true`,
      `task:${TASK_ID}:${ASSIGNEE_A}:true`,
    ])
  })
})
