import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  type AiDisputeEvaluationRow,
  seedEvaluation,
  signCallback,
} from './support/ai_dispute_callback_test_support.js'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Public | AI Dispute Callback - HTTP API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    delete process.env['AI_CALLBACK_SECRET']
    await cleanupTestData()
  })

  test('public callback HTTP route accepts camelCase and returns wrapped payload', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)

    const response = await client
      .post('/api/public/ai-disputes/callback')
      .header('accept', 'application/json')
      .header('X-Timestamp', String(timestamp))
      .header('X-Signature', signCallback(timestamp, evaluationId, 'completed', secret))
      .json({
        evaluationId,
        status: 'completed',
        recommendation: 'uphold_review',
        confidenceScore: 0.91,
        summary: 'Evidence is consistent',
        responsePayload: { verdict: 'keep' },
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        disputeId: string
        status: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, evaluationId)
    assert.equal(body.data.status, 'completed')
  })

  test('public callback accepts clawagent disputeId alias and normalizes nested action items', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)

    const response = await client
      .post('/api/public/ai-disputes/callback')
      .header('accept', 'application/json')
      .header('X-Timestamp', String(timestamp))
      .header('X-Signature', signCallback(timestamp, evaluationId, 'completed', secret))
      .json({
        disputeId: evaluationId,
        status: 'completed',
        recommendation: 'adjust_score',
        response_payload: {
          verdict: {
            verdict: '70% Respondent, 30% Claimant',
            actionItems: ['Notify both parties'],
          },
        },
      })

    response.assertStatus(200)

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

    assert.equal(evaluation?.status, 'completed')
    assert.deepEqual(payload.verdict?.action_items, ['Notify both parties'])
    assert.deepEqual(payload.verdict?.actionItems, ['Notify both parties'])
  })

  test('public callback rejects mismatched review dispute identifier without mutating evaluation', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { caseFileId, evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)

    const response = await client
      .post('/api/public/ai-disputes/callback')
      .header('accept', 'application/json')
      .header('X-Timestamp', String(timestamp))
      .header('X-Signature', signCallback(timestamp, evaluationId, 'completed', secret))
      .json({
        evaluation_id: evaluationId,
        review_dispute_id: testId(),
        case_file_id: caseFileId,
        status: 'completed',
        recommendation: 'adjust_score',
        response_payload: { verdict: 'mismatched identifiers must not update state' },
      })

    response.assertStatus(401)
    assert.notInclude(response.text(), evaluationId)

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
    assert.isNull(evaluation?.recommendation)
  })

  test('legacy callback alias still accepts snake_case payload and returns wrapped data', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)

    const response = await client
      .post('/api/public/ai/dispute-evaluations/callback')
      .header('accept', 'application/json')
      .json({
        evaluation_id: evaluationId,
        status: 'completed',
        recommendation: 'uphold_review',
        confidence_score: 0.88,
        summary: 'Legacy payload still works',
        response_payload: { verdict: 'keep' },
        timestamp,
        signature: signCallback(timestamp, evaluationId, 'completed', secret),
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        disputeId: string
        status: string
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, evaluationId)
    assert.equal(body.data.status, 'completed')
  })

  test('public callback rejects malformed payload without mutating evaluation', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation()
    const timestamp = Math.floor(Date.now() / 1000)

    const response = await client
      .post('/api/public/ai-disputes/callback')
      .header('accept', 'application/json')
      .header('X-Timestamp', String(timestamp))
      .header('X-Signature', signCallback(timestamp, evaluationId, 'completed', secret))
      .json({
        evaluationId,
        recommendation: 'uphold_review',
        confidenceScore: 0.91,
        responsePayload: { verdict: 'keep' },
      })

    response.assertStatus(422)
    assert.notInclude(response.text(), evaluationId)
    assert.notInclude(response.text(), 'E_INTERNAL_ERROR')

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
    assert.isNull(evaluation?.recommendation)
    assert.isNull(evaluation?.summary)
  })
})
