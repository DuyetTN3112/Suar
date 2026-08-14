import { test } from '@japa/runner'

import { DomainEventTaskAssignmentCompletionEventWriterAdapter } from '#composition/adapters/events/domain_event_task_assignment_completion_event_writer_adapter'
import CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/task-assignment/complete_task_assignments_command'
import type { TaskAssignmentCompletionEventWriter } from '#modules/tasks/actions/ports/outbound/task_assignment_completion_event_writer'
import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskReviewReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

const input = {
  taskId: '11111111-1111-4111-8111-111111111111',
  assignedTo: '22222222-2222-4222-8222-222222222222',
  changedBy: '33333333-3333-4333-8333-333333333333',
}

function makeCommand({
  completeAssignments,
  ensureReviewWorkflow = () => Promise.resolve(),
  stage,
}: {
  completeAssignments: TaskAssignmentRepository['completeActiveForTask']
  ensureReviewWorkflow?: TaskReviewReader['ensureTaskReviewWorkflow']
  stage: TaskAssignmentCompletionEventWriter['stage']
}): CompleteTaskAssignmentsCommand {
  const assignments = { completeActiveForTask: completeAssignments }
  const reviews = { ensureTaskReviewWorkflow: ensureReviewWorkflow }

  return new CompleteTaskAssignmentsCommand(
    assignments as TaskAssignmentRepository,
    reviews as TaskReviewReader,
    { stage }
  )
}

test.group('Complete task assignments command', () => {
  test('completes assignments, opens review workflow, then stages events on the caller transaction', async ({
    assert,
  }) => {
    const transaction = { marker: 'source-transaction' }
    const observed: Array<{
      operation: string
      transaction: object
      taskId?: string
      taskAssignmentId?: string
    }> = []

    const command = makeCommand({
      completeAssignments: (_input, receivedTransaction) => {
        observed.push({
          operation: 'completeAssignments',
          transaction: receivedTransaction as object,
        })
        return Promise.resolve([
          {
            id: '44444444-4444-4444-8444-444444444444',
            assignee_id: '55555555-5555-4555-8555-555555555555',
          },
        ])
      },
      ensureReviewWorkflow: (taskId, taskAssignmentId, _changedBy, receivedTransaction) => {
        observed.push({
          operation: 'ensureReviewWorkflow',
          transaction: receivedTransaction,
          taskId,
          taskAssignmentId,
        })
        return Promise.resolve()
      },
      stage: (event, receivedTransaction) => {
        observed.push({
          operation: `stage:${event.assignmentId}`,
          transaction: receivedTransaction,
        })
        return Promise.resolve()
      },
    })

    await command.execute(input, transaction)

    assert.deepEqual(
      observed.map((entry) => entry.operation),
      ['completeAssignments', 'ensureReviewWorkflow', 'stage:44444444-4444-4444-8444-444444444444']
    )
    assert.isTrue(observed.every((entry) => entry.transaction === transaction))
    assert.equal(observed[1]?.taskId, input.taskId)
    assert.equal(observed[1]?.taskAssignmentId, '44444444-4444-4444-8444-444444444444')
  })

  test('stages one typed completion event for every completed assignment', async ({ assert }) => {
    const staged: Array<{
      taskId: string
      assignmentId: string
      assigneeId: string
    }> = []
    const command = makeCommand({
      completeAssignments: () =>
        Promise.resolve([
          {
            id: '44444444-4444-4444-8444-444444444444',
            assignee_id: '55555555-5555-4555-8555-555555555555',
          },
          {
            id: '66666666-6666-4666-8666-666666666666',
            assignee_id: '77777777-7777-4777-8777-777777777777',
          },
        ]),
      stage: (event) => {
        staged.push(event)
        return Promise.resolve()
      },
    })

    await command.execute(input, {})

    assert.deepEqual(staged, [
      {
        taskId: input.taskId,
        assignmentId: '44444444-4444-4444-8444-444444444444',
        assigneeId: '55555555-5555-4555-8555-555555555555',
      },
      {
        taskId: input.taskId,
        assignmentId: '66666666-6666-4666-8666-666666666666',
        assigneeId: '77777777-7777-4777-8777-777777777777',
      },
    ])
  })

  test('propagates event persistence failure so the parent transaction can roll back', async ({
    assert,
  }) => {
    const stagedAssignmentIds: string[] = []
    const command = makeCommand({
      completeAssignments: () =>
        Promise.resolve([
          {
            id: '44444444-4444-4444-8444-444444444444',
            assignee_id: '55555555-5555-4555-8555-555555555555',
          },
          {
            id: '66666666-6666-4666-8666-666666666666',
            assignee_id: '77777777-7777-4777-8777-777777777777',
          },
        ]),
      stage: (event) => {
        stagedAssignmentIds.push(event.assignmentId)
        return event.assignmentId === '66666666-6666-4666-8666-666666666666'
          ? Promise.reject(new Error('durable outbox unavailable'))
          : Promise.resolve()
      },
    })

    await assert.rejects(() => command.execute(input, {}), /durable outbox unavailable/)
    assert.deepEqual(stagedAssignmentIds, [
      '44444444-4444-4444-8444-444444444444',
      '66666666-6666-4666-8666-666666666666',
    ])
  })

  test('composition adapter maps the task event to the durable domain outbox envelope', async ({
    assert,
  }) => {
    const transaction = { marker: 'source-transaction' }
    const staged: Array<{ transaction: object; input: unknown }> = []
    const adapter = new DomainEventTaskAssignmentCompletionEventWriterAdapter(
      (receivedTransaction, event) => {
        staged.push({ transaction: receivedTransaction, input: event })
        return Promise.resolve({ id: event.aggregateId, staged: true })
      }
    )

    await adapter.stage(
      {
        taskId: input.taskId,
        assignmentId: '44444444-4444-4444-8444-444444444444',
        assigneeId: '55555555-5555-4555-8555-555555555555',
      },
      transaction
    )

    assert.deepEqual(staged, [
      {
        transaction,
        input: {
          eventName: 'task:assignment:completed',
          dedupeKey: 'task-assignment-completed:44444444-4444-4444-8444-444444444444',
          aggregateType: 'task_assignment',
          aggregateId: '44444444-4444-4444-8444-444444444444',
          payload: {
            taskId: input.taskId,
            assignmentId: '44444444-4444-4444-8444-444444444444',
            assigneeId: '55555555-5555-4555-8555-555555555555',
          },
        },
      },
    ])
  })
})
