import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  aiDisputeUnitOfWork,
  type AiDisputeEvaluationRow,
  type ReviewDisputeRow,
  reviewCryptography,
  seedEvaluation,
  signCallback,
} from './support/ai_dispute_callback_test_support.js'

import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ProcessAiDisputeCallbackCommand from '#modules/disputes/actions/commands/process_ai_dispute_callback_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Public | AI Dispute Callback - Command & Security', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    delete process.env['AI_CALLBACK_SECRET']
    await cleanupTestData()
  })

  test('rejects a completed callback without profile assessment when the request required it', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation({ requiresProfileAssessment: true })
    const timestamp = Math.floor(Date.now() / 1000)

    await assert.rejects(
      () =>
        new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork).execute({
          evaluation_id: evaluationId,
          status: 'completed',
          response_payload: { verdict: { recommendation: 'adjust_score' } },
          timestamp,
          signature: signCallback(timestamp, evaluationId, 'completed', secret),
        })
    )

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
    assert.deepEqual(evaluation?.response_payload ?? {}, {})
  })

  test('valid signed callback updates evaluation state', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { disputeId, evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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
    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .first()) as ReviewDisputeRow | null

    assert.equal(result.id, evaluationId)
    assert.equal(result.dispute_id, disputeId)
    assert.equal(result.status, 'completed')
    assert.equal(evaluation?.status, 'completed')
    assert.equal(evaluation?.recommendation, 'uphold_review')
    assert.equal(Number(evaluation?.confidence_score), 0.91)
    assert.equal(evaluation?.summary, 'Evidence is consistent')
    assert.equal(dispute?.status, 'admin_reviewing')
  })

  test('callback derives first-class result columns from nested Clawagent verdict contract', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

    await command.execute({
      evaluation_id: evaluationId,
      status: 'completed',
      response_payload: {
        verdict: {
          recommendation: 'adjust_score',
          verdict: '70% Respondent, 30% Claimant',
          rationale: 'Mock rationale based on provided evidence.',
          evidence_summary: 'Task evidence supports a partial adjustment.',
          score_or_review_delta: 'Partial score adjustment',
          actionItems: ['Notify both parties'],
          unknowns_or_missing_evidence: 'none',
          confidence: 0.93,
        },
      },
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'completed', secret),
    })

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    const payload = (
      typeof evaluation?.response_payload === 'string'
        ? JSON.parse(evaluation.response_payload)
        : (evaluation?.response_payload ?? {})
    ) as {
      verdict?: {
        action_items?: string[]
        actionItems?: string[]
      }
    }

    assert.equal(evaluation?.recommendation, 'adjust_score')
    assert.equal(Number(evaluation?.confidence_score), 0.93)
    assert.equal(evaluation?.summary, '70% Respondent, 30% Claimant')
    assert.deepEqual(payload.verdict?.action_items, ['Notify both parties'])
    assert.deepEqual(payload.verdict?.actionItems, ['Notify both parties'])
  })

  test('bad signature is rejected', async ({ assert }) => {
    process.env['AI_CALLBACK_SECRET'] = 'callback-secret'
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000) - 601
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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

  test('unknown evaluation callback is rejected without creating evaluation rows', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const missingEvaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

    const beforeCount = (await db.from('ai_dispute_evaluations').count('* as total').first()) as {
      total: number | string
    } | null

    await assert.rejects(
      () =>
        command.execute({
          evaluation_id: missingEvaluationId,
          status: 'completed',
          recommendation: 'uphold_review',
          confidence_score: 0.72,
          summary: 'Unknown evaluation must not create state',
          response_payload: { verdict: 'missing' },
          timestamp,
          signature: signCallback(timestamp, missingEvaluationId, 'completed', secret),
        }),
      NotFoundException
    )

    const afterCount = (await db.from('ai_dispute_evaluations').count('* as total').first()) as {
      total: number | string
    } | null
    assert.deepEqual(afterCount, beforeCount)
  })

  test('processing evaluation accepts failed callback and transitions dispute to admin review', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { disputeId, evaluationId } = await seedEvaluation({ evaluationStatus: 'processing' })
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

    const result = await command.execute({
      evaluation_id: evaluationId,
      status: 'failed',
      error_message: 'Model timeout',
      response_payload: { retryable: true },
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'failed', secret),
    })

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as (AiDisputeEvaluationRow & { error_message: string | null }) | null
    const dispute = (await db
      .from('review_disputes')
      .where('id', disputeId)
      .first()) as ReviewDisputeRow | null

    assert.equal(result.id, evaluationId)
    assert.equal(result.status, 'failed')
    assert.equal(evaluation?.status, 'failed')
    assert.equal(evaluation?.error_message, 'Model timeout')
    assert.equal(dispute?.status, 'admin_reviewing')
  })

  test('missing secret is rejected', async ({ assert }) => {
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
  })

  test('duplicate callback on finished evaluation is idempotent and does not rewrite state', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation({ evaluationStatus: 'completed' })
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

    const before = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .select('status', 'completed_at')
      .first()) as { status: string; completed_at: string | null } | null

    const result = await command.execute({
      evaluation_id: evaluationId,
      status: 'completed',
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'completed', secret),
    })

    const after = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .select('status', 'completed_at')
      .first()) as { status: string; completed_at: string | null } | null
    assert.deepInclude(result, {
      id: evaluationId,
      status: 'completed',
    })
    assert.deepEqual(after, before)
  })

  test('callback rejects a conflicting terminal status without rewriting state', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation({ evaluationStatus: 'completed' })
    const timestamp = Math.floor(Date.now() / 1000)

    await assert.rejects(
      () =>
        new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork).execute({
          evaluation_id: evaluationId,
          status: 'failed',
          timestamp,
          signature: signCallback(timestamp, evaluationId, 'failed', secret),
        }),
      ConflictException
    )

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .select('status')
      .first()) as { status: string } | null
    assert.equal(evaluation?.status, 'completed')
  })
})
