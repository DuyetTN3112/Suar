import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'
import {
  ClawagentDisputeClient,
  type ClawagentTriggerResult,
} from '#modules/reviews/infra/adapters/disputes/clawagent_dispute_client'
import { LucidAiDisputeEvaluationGateway } from '#modules/reviews/infra/adapters/disputes/lucid_ai_dispute_evaluation_gateway'
import {
  PostgresAiDisputeAutoQueueIntentRepository,
  stageAiDisputeAutoQueueIntent,
} from '#modules/reviews/infra/repositories/disputes/postgres_ai_dispute_auto_queue_intent_repository'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { assertSafeTestDatastores } from '#tests/helpers/test_datastore_guard'

class RejectingClawagentDisputeClient extends ClawagentDisputeClient {
  constructor(private readonly diagnostic: string) {
    super({ url: 'http://clawagent.test/disputes' })
  }

  override trigger(): Promise<ClawagentTriggerResult> {
    return Promise.reject(new Error(this.diagnostic))
  }
}

test.group('AI dispute auto-queue intent atomicity', (group) => {
  group.setup(async () => {
    await setupApp()
    await assertSafeTestDatastores()
    await db.from('ai_dispute_auto_queue_intents').delete()
  })

  group.teardown(async () => {
    await db.from('ai_dispute_auto_queue_intents').delete()
    await teardownApp()
  })

  test('rolls back the intent with its report transaction', async ({ assert }) => {
    const sourceId = randomUUID()
    const trx = await db.transaction()
    await stageAiDisputeAutoQueueIntent(trx, {
      sourceType: 'review_dispute',
      sourceId,
      requestContext: {
        userId: randomUUID(),
        ip: '127.0.0.1',
        userAgent: 'integration-test',
        organizationId: randomUUID(),
        requestId: 'request-rollback',
        traceId: 'trace-rollback',
        workflowId: 'workflow-rollback',
      },
    })
    await trx.rollback()

    const row: unknown = await db
      .from('ai_dispute_auto_queue_intents')
      .where('source_type', 'review_dispute')
      .where('source_id', sourceId)
      .first()
    assert.isNull(row)
  })

  test('commits one idempotent recovery intent with correlation context', async ({ assert }) => {
    const sourceId = randomUUID()
    const organizationId = randomUUID()
    const requestContext = {
      userId: randomUUID(),
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId,
      requestId: 'request-commit',
      traceId: 'trace-commit',
      workflowId: 'workflow-commit',
    }

    await db.transaction(async (trx) => {
      await stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'task_review_workflow',
        sourceId,
        requestContext,
      })
      await stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'task_review_workflow',
        sourceId,
        requestContext,
      })
    })

    const rows = (await db
      .from('ai_dispute_auto_queue_intents')
      .where('source_type', 'task_review_workflow')
      .where('source_id', sourceId)
      .select('*')) as Array<Record<string, unknown>>
    assert.lengthOf(rows, 1)
    assert.equal(rows[0]?.['status'], 'pending')
    assert.equal(rows[0]?.['organization_id'], organizationId)
    assert.equal(rows[0]?.['request_id'], 'request-commit')
    assert.equal(rows[0]?.['trace_id'], 'trace-commit')
    assert.equal(rows[0]?.['workflow_id'], 'workflow-commit')
  })

  test('re-arms a terminal intent when a workflow is reported again before any evaluation exists', async ({
    assert,
  }) => {
    const sourceId = randomUUID()
    const organizationId = randomUUID()
    const requestContext = {
      userId: randomUUID(),
      ip: '127.0.0.1',
      userAgent: 'integration-test',
      organizationId,
      requestId: 'request-reported-again',
      traceId: 'trace-reported-again',
      workflowId: 'workflow-reported-again',
    }

    await db.transaction((trx) =>
      stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'task_review_workflow',
        sourceId,
        requestContext,
      })
    )
    await db
      .from('ai_dispute_auto_queue_intents')
      .where('source_type', 'task_review_workflow')
      .where('source_id', sourceId)
      .update({
        status: 'processed',
        processed_at: new Date(),
        last_error_code: 'stale-terminal-intent',
      })

    await db.transaction((trx) =>
      stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'task_review_workflow',
        sourceId,
        requestContext,
      })
    )

    const row = (await db
      .from('ai_dispute_auto_queue_intents')
      .where('source_type', 'task_review_workflow')
      .where('source_id', sourceId)
      .first()) as Record<string, unknown>
    assert.equal(row['status'], 'pending')
    assert.isNull(row['processed_at'])
    assert.isNull(row['last_error_code'])
    assert.equal(row['request_id'], requestContext.requestId)
  })

  test('allows only one immediate or background worker to lease a source', async ({ assert }) => {
    const sourceId = randomUUID()
    await db.transaction((trx) =>
      stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'sprint_review_dispute',
        sourceId,
        requestContext: {
          userId: randomUUID(),
          ip: '127.0.0.1',
          userAgent: 'integration-test',
          organizationId: randomUUID(),
        },
      })
    )

    const repository = new PostgresAiDisputeAutoQueueIntentRepository()
    const now = new Date()
    const claims = await Promise.all([
      repository.claimSource({
        workerId: 'immediate-worker',
        sourceType: 'sprint_review_dispute',
        sourceId,
        leaseMs: 60_000,
        now,
      }),
      repository.claimSource({
        workerId: 'background-worker',
        sourceType: 'sprint_review_dispute',
        sourceId,
        leaseMs: 60_000,
        now,
      }),
    ])

    assert.lengthOf(
      claims.filter((claim) => claim !== null),
      1
    )
  })

  test('reclaims an expired lease with a new fencing token', async ({ assert }) => {
    const sourceId = randomUUID()
    await db.transaction((trx) =>
      stageAiDisputeAutoQueueIntent(trx, {
        sourceType: 'review_dispute',
        sourceId,
        requestContext: {
          userId: randomUUID(),
          ip: '127.0.0.1',
          userAgent: 'integration-test',
          organizationId: randomUUID(),
        },
      })
    )

    const repository = new PostgresAiDisputeAutoQueueIntentRepository()
    const firstClaimedAt = new Date(Date.now() + 1_000)
    const firstClaim = await repository.claimSource({
      workerId: 'first-worker',
      sourceType: 'review_dispute',
      sourceId,
      leaseMs: 5_000,
      now: firstClaimedAt,
    })
    assert.isNotNull(firstClaim)

    const reclaimedAt = new Date(firstClaimedAt.getTime() + 5_001)
    const reclaimed = await repository.claimSource({
      workerId: 'recovery-worker',
      sourceType: 'review_dispute',
      sourceId,
      leaseMs: 5_000,
      now: reclaimedAt,
    })
    assert.isNotNull(reclaimed)
    assert.notEqual(reclaimed?.leaseToken, firstClaim?.leaseToken)
    assert.equal(firstClaim?.attemptCount, 1)
    assert.equal(reclaimed?.attemptCount, 2)
    if (!firstClaim || !reclaimed) {
      throw new TypeError('Expected both lease claims to exist')
    }

    const oldOwnerAcknowledged = await repository.acknowledge({
      job: firstClaim,
      now: new Date(reclaimedAt.getTime() + 1),
    })
    const recoveryOwnerAcknowledged = await repository.acknowledge({
      job: reclaimed,
      now: new Date(reclaimedAt.getTime() + 1),
    })

    assert.isFalse(oldOwnerAcknowledged)
    assert.isTrue(recoveryOwnerAcknowledged)
  })

  test('rolls back the staged evaluation when the transactional audit hook fails', async ({
    assert,
  }) => {
    const disputeId = randomUUID()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: randomUUID(),
      task_assignment_id: randomUUID(),
      task_id: randomUUID(),
      reviewee_id: randomUUID(),
      opened_by: randomUUID(),
      status: 'admin_reviewing',
      dispute_reason: 'Integration audit atomicity check',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
    })

    try {
      const service = new LucidAiDisputeEvaluationGateway(
        new ClawagentDisputeClient({ url: 'http://clawagent.test/disputes' })
      )
      await assert.rejects(
        () =>
          service.stage({
            disputeId,
            caseFileId: null,
            sourceType: 'review_dispute',
            sourceId: disputeId,
            sourceTable: 'review_disputes',
            expectedSourceStatus: 'admin_reviewing',
            provider: 'clawagent',
            requestPayload: { dispute_id: disputeId },
            buildTriggerPayload: (evaluationId) => ({ evaluation_id: evaluationId }),
            beforeCommit: () =>
              Promise.reject(new TypeError('simulated audit persistence failure')),
          }),
        TypeError
      )

      const evaluation: unknown = await db
        .from('ai_dispute_evaluations')
        .where('source_type', 'review_dispute')
        .where('source_id', disputeId)
        .first()
      assert.isNull(evaluation)
    } finally {
      await db.from('ai_dispute_evaluations').where('source_id', disputeId).delete()
      await db.from('review_disputes').where('id', disputeId).delete()
    }
  })

  test('keeps ambiguous dispatch durable and emits privacy-safe evidence even when telemetry fails', async ({
    assert,
  }) => {
    const disputeId = randomUUID()
    const secret = 'customer-token-do-not-log'
    const events: PlatformEvent[] = []
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: randomUUID(),
      task_assignment_id: randomUUID(),
      task_id: randomUUID(),
      reviewee_id: randomUUID(),
      opened_by: randomUUID(),
      status: 'admin_reviewing',
      dispute_reason: 'Integration ambiguous dispatch check',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
    })

    const client = new RejectingClawagentDisputeClient(
      `transport closed after write: ${secret}`
    )
    const service = new LucidAiDisputeEvaluationGateway(client, {
      now: () => new Date(Date.now() + 1_000),
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
          throw new Error('telemetry sink unavailable')
        },
      },
    })

    try {
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
          credential: secret,
        }),
      })
      const evaluationId = staged.created['id'] as string

      const reconciliation = await service.reconcileOnce()
      const evaluation = (await db
        .from('ai_dispute_evaluations')
        .where('id', evaluationId)
        .select('status', 'trigger_state', 'trigger_attempt_count')
        .first()) as
        | {
            status: string
            trigger_state: string
            trigger_attempt_count: number
          }
        | undefined
      const event = events.find((candidate) => candidate.target?.id === evaluationId)

      assert.isAtLeast(reconciliation.skipped, 1)
      assert.equal(evaluation?.['status'], 'queued')
      assert.equal(evaluation?.['trigger_state'], 'dispatching')
      assert.equal(Number(evaluation?.['trigger_attempt_count']), 1)
      assert.equal(event?.event_name, 'review.dispute.ai_evaluation.dispatch_ambiguous')
      assert.equal(event?.outcome, 'warning')
      assert.equal(event?.error?.['class'], 'Error')
      assert.notInclude(JSON.stringify(event), secret)
      assert.notProperty(event?.change ?? {}, 'source_id')
    } finally {
      await db.from('ai_dispute_evaluations').where('source_id', disputeId).delete()
      await db.from('review_disputes').where('id', disputeId).delete()
    }
  })
})
