import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

function signCallback(
  timestamp: number,
  evaluationId: string,
  status: 'completed' | 'failed',
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${evaluationId}:${status}`)
    .digest('hex')
}

async function seedEvaluation(input: {
  evaluationStatus?: string
  disputeStatus?: string
} = {}) {
  const disputeId = testId()
  const caseFileId = testId()
  const evaluationId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: testId(),
    task_assignment_id: testId(),
    task_id: testId(),
    reviewee_id: testId(),
    opened_by: testId(),
    status: input.disputeStatus ?? 'ai_reviewing',
    dispute_reason: 'Need second opinion on evaluation',
    disputed_dimensions: JSON.stringify({ quality: true }),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
  })

  await db.table('ai_dispute_evaluations').insert({
    id: evaluationId,
    dispute_id: disputeId,
    case_file_id: caseFileId,
    provider: 'ai_council',
    status: input.evaluationStatus ?? 'queued',
    request_payload: JSON.stringify({ trace: 'fixture' }),
  })

  return { disputeId, evaluationId }
}

interface AiDisputeEvaluationRow {
  status: string
  recommendation: string | null
  confidence_score: string | number | null
  summary: string | null
}

interface ReviewDisputeRow {
  status: string
}

test.group('Integration | Public | AI Dispute Callback', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    delete process.env.AI_CALLBACK_SECRET
    await cleanupTestData()
  })

  test('valid signed callback updates evaluation state', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env.AI_CALLBACK_SECRET = secret
    const { disputeId, evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    const result = await command.execute({
      evaluation_id: evaluationId,
      status: 'completed',
      recommendation: 'uphold_review',
      confidence_score: 0.91,
      summary: 'Evidence is consistent',
      response_payload: { verdict: 'keep' },
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'completed', secret),
    })

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    const dispute = (await db.from('review_disputes').where('id', disputeId).first()) as ReviewDisputeRow | null

    assert.equal(result.id, evaluationId)
    assert.equal(result.dispute_id, disputeId)
    assert.equal(result.status, 'completed')
    assert.equal(evaluation?.status, 'completed')
    assert.equal(evaluation?.recommendation, 'uphold_review')
    assert.equal(Number(evaluation?.confidence_score), 0.91)
    assert.equal(evaluation?.summary, 'Evidence is consistent')
    assert.equal(dispute?.status, 'admin_reviewing')
  })

  test('bad signature is rejected', async ({ assert }) => {
    process.env.AI_CALLBACK_SECRET = 'callback-secret'
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    await assert.rejects(
      () =>
        command.execute({
          evaluation_id: evaluationId,
          status: 'completed',
          timestamp,
          signature: 'bad-signature',
        }),
      UnauthorizedException
    )

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
  })

  test('expired timestamp is rejected', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env.AI_CALLBACK_SECRET = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000) - 601
    const command = new ProcessAiDisputeCallbackCommand()

    await assert.rejects(
      () =>
        command.execute({
          evaluation_id: evaluationId,
          status: 'completed',
          timestamp,
          signature: signCallback(timestamp, evaluationId, 'completed', secret),
        }),
      UnauthorizedException
    )

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
  })

  test('missing secret is rejected', async ({ assert }) => {
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    await assert.rejects(
      () =>
        command.execute({
          evaluation_id: evaluationId,
          status: 'completed',
          timestamp,
          signature: signCallback(timestamp, evaluationId, 'completed', 'some-secret'),
        }),
      UnauthorizedException
    )
  })

  test('duplicate callback on finished evaluation is rejected', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env.AI_CALLBACK_SECRET = secret
    const { evaluationId } = await seedEvaluation({ evaluationStatus: 'completed' })
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    await assert.rejects(
      () =>
        command.execute({
          evaluation_id: evaluationId,
          status: 'completed',
          timestamp,
          signature: signCallback(timestamp, evaluationId, 'completed', secret),
        }),
      BusinessLogicException
    )
  })
})
