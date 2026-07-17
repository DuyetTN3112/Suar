import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type {
  ClawagentDisputeClient,
  ClawagentTriggerResult,
} from '#modules/reviews/infra/adapters/disputes/clawagent_dispute_client'
import { LucidAiDisputeEvaluationGateway } from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_evaluation_gateway'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}

interface EvaluationStateProjection {
  status: string
  external_run_id: string | null
  trigger_state: string
  trigger_dispatch_token: string | null
  trigger_error_code?: string | null
  trigger_attempt_count?: number | string
}

interface SourceStateProjection {
  status: string
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

async function waitForCallCount(readCount: () => number, expected: number): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (readCount() >= expected) {
      return
    }
    await delay(5)
  }
  throw new Error(`Timed out waiting for ${String(expected)} Clawagent call(s)`)
}

async function createReviewDispute(): Promise<string> {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const reviewSession = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
  })
  const disputeId = randomUUID()
  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: reviewSession.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: owner.id,
    status: 'admin_reviewing',
    dispute_reason: 'AI trigger fencing integration check',
    disputed_dimensions: JSON.stringify({}),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
  })
  return disputeId
}

async function stageEvaluation(
  service: LucidAiDisputeEvaluationGateway,
  disputeId: string
): Promise<{
  evaluationId: string
  input: {
    evaluationId: string
    sourceTable: 'review_disputes'
    sourceId: string
    expectedSourceStatus: string
    triggerPayload: Record<string, unknown>
  }
}> {
  const staged = await service.stage({
    disputeId,
    caseFileId: null,
    sourceType: 'review_dispute',
    sourceId: disputeId,
    sourceTable: 'review_disputes',
    expectedSourceStatus: 'admin_reviewing',
    provider: 'clawagent',
    requestPayload: { dispute_id: disputeId },
    buildTriggerPayload: (evaluationId) => ({
      evaluation_id: evaluationId,
      dispute_id: disputeId,
    }),
  })
  const evaluationId = staged.created['id'] as string
  return {
    evaluationId,
    input: {
      evaluationId,
      sourceTable: 'review_disputes',
      sourceId: disputeId,
      expectedSourceStatus: 'admin_reviewing',
      triggerPayload: staged.triggerPayload,
    },
  }
}

async function cleanup(disputeId: string): Promise<void> {
  await db.from('ai_dispute_evaluations').where('source_id', disputeId).delete()
  await db.from('review_disputes').where('id', disputeId).delete()
}

const accepted = (externalRunId: string): ClawagentTriggerResult => ({
  ok: true,
  externalRunId,
})

const retryableFailure = (): ClawagentTriggerResult => ({
  ok: false,
  code: 'CLAWAGENT_NETWORK_ERROR',
  retryable: true,
  diagnostic: 'connection reset',
  httpStatus: null,
})

const permanentFailure = (): ClawagentTriggerResult => ({
  ok: false,
  code: 'CLAWAGENT_HTTP_ERROR',
  retryable: false,
  diagnostic: 'request rejected',
  httpStatus: 400,
})

test.group('AI dispute trigger dispatch fencing', (group) => {
  group.setup(async () => {
    await setupApp()
    await assertSafeTestDatastores()
  })

  group.teardown(async () => {
    await teardownApp()
  })
  group.each.teardown(async () => {
    await cleanupTestData()
  })

  test('rejects a late failure after a newer attempt was accepted', async ({ assert }) => {
    const disputeId = await createReviewDispute()
    const firstAttempt = deferred<ClawagentTriggerResult>()
    let callCount = 0
    const client = {
      trigger: async () => {
        callCount += 1
        return callCount === 1 ? firstAttempt.promise : accepted('newer-run')
      },
    } as unknown as ClawagentDisputeClient
    const service = new LucidAiDisputeEvaluationGateway(client, {
      staleDispatchMs: 1_000,
      now: () => new Date(Date.now() + 120_000),
      random: () => 0,
    })

    try {
      const staged = await stageEvaluation(service, disputeId)
      const oldDispatch = service.dispatch(staged.input)
      await waitForCallCount(() => callCount, 1)

      const reconciliation = await service.reconcileOnce()
      firstAttempt.resolve(permanentFailure())
      const staleResult = await oldDispatch
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', staged.evaluationId)
        .select(
          'status',
          'external_run_id',
          'trigger_state',
          'trigger_dispatch_token',
          'trigger_error_code'
        )
        .first()) as unknown as EvaluationStateProjection | undefined

      assert.equal(reconciliation.recoveredStale, 1)
      assert.equal(reconciliation.accepted, 1)
      assert.isTrue(staleResult.leaseLost)
      assert.equal(evaluation?.status, 'processing')
      assert.equal(evaluation?.external_run_id, 'newer-run')
      assert.equal(evaluation?.trigger_state, 'accepted')
      assert.isNull(evaluation?.trigger_dispatch_token)
      assert.isNull(evaluation?.trigger_error_code)
    } finally {
      await cleanup(disputeId)
    }
  })

  test('rejects a late success after a newer attempt scheduled a retry', async ({ assert }) => {
    const disputeId = await createReviewDispute()
    const firstAttempt = deferred<ClawagentTriggerResult>()
    let callCount = 0
    const client = {
      trigger: async () => {
        callCount += 1
        return callCount === 1 ? firstAttempt.promise : retryableFailure()
      },
    } as unknown as ClawagentDisputeClient
    const service = new LucidAiDisputeEvaluationGateway(client, {
      staleDispatchMs: 1_000,
      now: () => new Date(Date.now() + 120_000),
      random: () => 0,
    })

    try {
      const staged = await stageEvaluation(service, disputeId)
      const oldDispatch = service.dispatch(staged.input)
      await waitForCallCount(() => callCount, 1)

      const reconciliation = await service.reconcileOnce()
      firstAttempt.resolve(accepted('stale-run'))
      const staleResult = await oldDispatch
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', staged.evaluationId)
        .select(
          'status',
          'external_run_id',
          'trigger_state',
          'trigger_dispatch_token',
          'trigger_error_code'
        )
        .first()) as unknown as EvaluationStateProjection | undefined
      const source = (await db
        .from('review_disputes')
        .where('id', disputeId)
        .select('status')
        .first()) as unknown as SourceStateProjection | undefined

      assert.equal(reconciliation.recoveredStale, 1)
      assert.equal(reconciliation.retried, 1)
      assert.isTrue(staleResult.leaseLost)
      assert.equal(evaluation?.status, 'queued')
      assert.isNull(evaluation?.external_run_id)
      assert.equal(evaluation?.trigger_state, 'retryable_failure')
      assert.isNull(evaluation?.trigger_dispatch_token)
      assert.equal(evaluation?.trigger_error_code, 'CLAWAGENT_NETWORK_ERROR')
      assert.equal(source?.status, 'admin_reviewing')
    } finally {
      await cleanup(disputeId)
    }
  })

  test('allows concurrent stale reconcilers to dispatch only one fenced attempt', async ({
    assert,
  }) => {
    const disputeId = await createReviewDispute()
    let callCount = 0
    const client = {
      trigger: () => {
        callCount += 1
        return Promise.resolve(accepted('recovered-run'))
      },
    } as unknown as ClawagentDisputeClient
    const serviceA = new LucidAiDisputeEvaluationGateway(client, {
      staleDispatchMs: 1_000,
      now: () => new Date(),
    })
    const serviceB = new LucidAiDisputeEvaluationGateway(client, {
      staleDispatchMs: 1_000,
      now: () => new Date(),
    })

    try {
      const staged = await stageEvaluation(serviceA, disputeId)
      await db
        .from('ai_dispute_evaluations')
        .where('id', staged.evaluationId)
        .update({
          trigger_state: 'dispatching',
          trigger_dispatch_token: randomUUID(),
          trigger_attempt_count: 1,
          trigger_last_attempt_at: new Date(Date.now() - 5_000),
          trigger_next_attempt_at: null,
        })

      const [resultA, resultB] = await Promise.all([
        serviceA.reconcileOnce(),
        serviceB.reconcileOnce(),
      ])
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', staged.evaluationId)
        .select(
          'status',
          'external_run_id',
          'trigger_state',
          'trigger_dispatch_token',
          'trigger_attempt_count'
        )
        .first()) as unknown as EvaluationStateProjection | undefined

      assert.equal(resultA.recoveredStale + resultB.recoveredStale, 1)
      assert.equal(callCount, 1)
      assert.equal(evaluation?.status, 'processing')
      assert.equal(evaluation?.external_run_id, 'recovered-run')
      assert.equal(evaluation?.trigger_state, 'accepted')
      assert.isNull(evaluation?.trigger_dispatch_token)
      assert.equal(Number(evaluation?.trigger_attempt_count), 2)
    } finally {
      await cleanup(disputeId)
    }
  })

  test('keeps an aborted external dispatch ambiguous instead of scheduling an immediate retry', async ({
    assert,
  }) => {
    const disputeId = await createReviewDispute()
    const controller = new AbortController()
    let callCount = 0
    const client = {
      trigger: (_evaluationId: string, _payload: Record<string, unknown>, signal?: AbortSignal) => {
        callCount += 1
        return new Promise<ClawagentTriggerResult>((_resolve, reject) => {
          signal?.addEventListener(
            'abort',
            () =>
              reject(
                signal.reason instanceof Error
                  ? signal.reason
                  : new DOMException('worker shutdown', 'AbortError')
              ),
            { once: true }
          )
        })
      },
    } as unknown as ClawagentDisputeClient
    const service = new LucidAiDisputeEvaluationGateway(client)

    try {
      const staged = await stageEvaluation(service, disputeId)
      const dispatch = service.dispatch(staged.input, controller.signal)
      await waitForCallCount(() => callCount, 1)
      controller.abort(new DOMException('worker shutdown', 'AbortError'))

      await assert.rejects(() => dispatch, /worker shutdown/)
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', staged.evaluationId)
        .select('status', 'trigger_state', 'trigger_dispatch_token', 'trigger_error_code')
        .first()) as unknown as EvaluationStateProjection | undefined
      const source = (await db
        .from('review_disputes')
        .where('id', disputeId)
        .select('status')
        .first()) as unknown as SourceStateProjection | undefined

      assert.equal(evaluation?.status, 'queued')
      assert.equal(evaluation?.trigger_state, 'dispatching')
      assert.isNotNull(evaluation?.trigger_dispatch_token)
      assert.isNull(evaluation?.trigger_error_code)
      assert.equal(source?.status, 'admin_reviewing')
    } finally {
      await cleanup(disputeId)
    }
  })
})
