import { test } from '@japa/runner'

import AcknowledgeTaskAssignmentContractCommand from '#modules/tasks/actions/commands/task-assignment/acknowledge_task_assignment_contract_command'
import RequestTaskAssignmentClarificationCommand from '#modules/tasks/actions/commands/task-assignment/request_task_assignment_clarification_command'
import type { TaskAssignmentContractRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_contract_repository'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { NodeTaskContractContentHasher } from '#modules/tasks/infra/adapters/task-submissions/node_task_contract_content_hasher'

const ASSIGNMENT_ID = '10000000-0000-4000-8000-000000000001'
const ASSIGNEE_ID = '10000000-0000-4000-8000-000000000002'
const SNAPSHOT_ID = '10000000-0000-4000-8000-000000000003'
const SNAPSHOT_HASH = `sha256:${'a'.repeat(64)}`
const NOW = '2026-08-01T11:00:00.000Z'
const transaction: TaskTransaction = {}
const actionContext: TaskActionContext = {
  userId: ASSIGNEE_ID,
  ip: '127.0.0.1',
  userAgent: 'unit-test',
  organizationId: null,
}

function context(overrides: Record<string, unknown> = {}) {
  return {
    assignmentId: ASSIGNMENT_ID,
    assigneeId: ASSIGNEE_ID,
    assignmentState: 'active' as const,
    taskState: 'active' as const,
    assigneeActive: true,
    acknowledgementRequired: true,
    clarificationOpen: false,
    currentSnapshot: {
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
    },
    existingAcknowledgement: null,
    ...overrides,
  }
}

function harness(contextOverrides: Record<string, unknown> = {}) {
  const calls: Array<{ name: string; input?: unknown }> = []
  const repository = {
    findAcknowledgementReplay: () => Promise.resolve(null),
    findClarificationReplay: () => Promise.resolve(null),
    lockInteractionContext: () => Promise.resolve(context(contextOverrides)),
    persistAcknowledgement: (input: { fact: unknown }) => {
      calls.push({ name: 'ack', input })
      return Promise.resolve({ fact: input.fact, replayed: false })
    },
    persistClarification: (input: { request: unknown }) => {
      calls.push({ name: 'clarification', input })
      return Promise.resolve({ fact: input.request, replayed: false })
    },
  } as unknown as TaskAssignmentContractRepository
  const dependencies = {
    repository,
    transactions: { run: <T>(work: (trx: TaskTransaction) => Promise<T>) => work(transaction) },
    hasher: new NodeTaskContractContentHasher(),
    clock: { nowIso: () => NOW },
    identityFactory: { nextId: () => '10000000-0000-4000-8000-000000000004' },
  }
  return { calls, dependencies }
}

test.group('Unit | Assignment interaction commands', () => {
  test('wraps acknowledgement success and application failure in the canonical Result', async ({
    assert,
  }) => {
    const { dependencies } = harness()
    const command = new AcknowledgeTaskAssignmentContractCommand(actionContext, dependencies)

    const success = await command.executeAndWrap({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      idempotencyKey: 'ack-result-success',
    })
    assert.isTrue(success.isSuccess())
    assert.equal(success.getValue().code, 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED')

    const failure = await command.executeAndWrap({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      idempotencyKey: '   ',
    })
    assert.isTrue(failure.isFailure())
    assert.equal(failure.getError().code, 'E_VALIDATION')
  })

  test('wraps clarification success and application failure in the canonical Result', async ({
    assert,
  }) => {
    const { dependencies } = harness()
    const command = new RequestTaskAssignmentClarificationCommand(actionContext, dependencies)

    const success = await command.executeAndWrap({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      reason: 'Please clarify the release boundary.',
      idempotencyKey: 'clarification-result-success',
    })
    assert.isTrue(success.isSuccess())
    assert.equal(success.getValue().code, 'TVA.ASSIGNMENT.CLARIFICATION_RECORDED')

    const failure = await command.executeAndWrap({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      reason: '   ',
      idempotencyKey: 'clarification-result-failure',
    })
    assert.isTrue(failure.isFailure())
    assert.equal(failure.getError().code, 'E_VALIDATION')
  })

  test('persists an acknowledgement pinned to exact snapshot/hash/head', async ({ assert }) => {
    const { calls, dependencies } = harness()
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      dependencies
    )

    const result = await command.execute({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      idempotencyKey: 'ack-browser-retry-1',
    })

    assert.equal(result.code, 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_RECORDED')
    assert.equal(result.fact.acknowledgedAt, NOW)
    assert.match((calls[0]?.input as { requestHash: string }).requestHash, /^sha256:[0-9a-f]{64}$/)
  })

  test('routes exact acknowledgement replay through the durable idempotency fence', async ({
    assert,
  }) => {
    const existingAcknowledgement = {
      assignmentId: ASSIGNMENT_ID,
      assigneeId: ASSIGNEE_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      acknowledgedAt: '2026-08-01T10:00:00.000Z',
    }
    const { calls, dependencies } = harness({ existingAcknowledgement })
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      dependencies
    )

    const result = await command.execute({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      idempotencyKey: 'ack-replay',
    })

    assert.equal(result.code, 'TVA.ASSIGNMENT.ACKNOWLEDGEMENT_IDEMPOTENT_REPLAY')
    assert.deepEqual(result.fact, existingAcknowledgement)
    assert.lengthOf(calls, 1)
    assert.equal(calls[0]?.name, 'ack')
  })

  test('does not let an existing acknowledgement hide a global idempotency collision', async ({
    assert,
  }) => {
    const existingAcknowledgement = {
      assignmentId: ASSIGNMENT_ID,
      assigneeId: ASSIGNEE_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      acknowledgedAt: '2026-08-01T10:00:00.000Z',
    }
    const { dependencies } = harness({ existingAcknowledgement })
    dependencies.repository.persistAcknowledgement = () =>
      Promise.reject(new Error('idempotency key collision'))
    const command = new AcknowledgeTaskAssignmentContractCommand(
      actionContext,
      dependencies
    )

    await assert.rejects(
      () =>
        command.execute({
          assignmentId: ASSIGNMENT_ID,
          snapshotId: SNAPSHOT_ID,
          snapshotHash: SNAPSHOT_HASH,
          contractVersionHead: 1,
          idempotencyKey: 'ack-collides-with-another-assignment',
        }),
      'idempotency key collision'
    )
  })

  test('fails closed for stale identity or unresolved clarification', async ({ assert }) => {
    for (const overrides of [
      { clarificationOpen: true },
      { currentSnapshot: { snapshotId: 'new', snapshotHash: SNAPSHOT_HASH, contractVersionHead: 2 } },
    ]) {
      const { dependencies } = harness(overrides)
      const command = new AcknowledgeTaskAssignmentContractCommand(
        actionContext,
        dependencies
      )
      await assert.rejects(() =>
        command.execute({
          assignmentId: ASSIGNMENT_ID,
          snapshotId: SNAPSHOT_ID,
          snapshotHash: SNAPSHOT_HASH,
          contractVersionHead: 1,
          idempotencyKey: 'ack-blocked',
        })
      )
    }
  })

  test('persists clarification as a separate fact with no acknowledgement effect', async ({
    assert,
  }) => {
    const { calls, dependencies } = harness()
    const command = new RequestTaskAssignmentClarificationCommand(
      actionContext,
      dependencies
    )

    const result = await command.execute({
      assignmentId: ASSIGNMENT_ID,
      snapshotId: SNAPSHOT_ID,
      snapshotHash: SNAPSHOT_HASH,
      contractVersionHead: 1,
      reason: 'Please clarify the production rollback boundary.',
      idempotencyKey: 'clarification-1',
    })

    assert.equal(result.code, 'TVA.ASSIGNMENT.CLARIFICATION_RECORDED')
    assert.equal(result.acknowledgementEffect, 'none')
    assert.equal(calls[0]?.name, 'clarification')
    assert.match((calls[0]?.input as { requestHash: string }).requestHash, /^sha256:[0-9a-f]{64}$/)
  })
})
