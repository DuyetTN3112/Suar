import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/http/exceptions/business_logic_exception'
import NotFoundException from '#modules/http/exceptions/not_found_exception'
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

async function seedEvaluation(
  input: {
    evaluationStatus?: string
    disputeStatus?: string
  } = {}
) {
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

  return { disputeId, caseFileId, evaluationId }
}

interface AiDisputeEvaluationRow {
  status: string
  recommendation: string | null
  confidence_score: string | number | null
  summary: string | null
  response_payload?: string | Record<string, unknown> | null
}

interface ReviewDisputeRow {
  status: string
}

interface SprintReviewDisputeRow {
  status: string
}

interface SprintReverseReviewWorkflowRow {
  status: string
}

interface TaskReviewWorkflowRow {
  status: string
}

test.group('Integration | Public | AI Dispute Callback', (group) => {
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

  test('valid signed callback updates evaluation state', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
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
    const command = new ProcessAiDisputeCallbackCommand()

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
    process.env['AI_CALLBACK_SECRET'] = secret
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

  test('unknown evaluation callback is rejected without creating evaluation rows', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const missingEvaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

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
    const command = new ProcessAiDisputeCallbackCommand()

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

  test('sprint review dispute callback transitions sprint source back to admin review', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const disputeId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    await db.table('sprint_review_disputes').insert({
      id: disputeId,
      package_id: testId(),
      opened_by: testId(),
      status: 'ai_reviewing',
      dispute_reason: 'Environment context needs AI review.',
      dispute_review_type: 'environment_review',
      requested_outcome: 'request_admin_review',
      runtime_context: JSON.stringify({
        dispute_review_type: 'environment_review',
        organization: { id: testId() },
        project: { id: testId() },
        sprint: { id: testId() },
      }),
      created_at: '2026-07-14T02:30:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
    await db.table('ai_dispute_evaluations').insert({
      id: evaluationId,
      dispute_id: disputeId,
      case_file_id: null,
      source_type: 'sprint_review_dispute',
      source_id: disputeId,
      provider: 'ai_council',
      status: 'processing',
      request_payload: JSON.stringify({ dispute_review_type: 'environment_review' }),
    })

    const result = await command.execute({
      evaluation_id: evaluationId,
      review_dispute_id: disputeId,
      status: 'completed',
      response_payload: {
        verdict: {
          recommendation: 'partially_accept',
          rationale: 'Environment context partially supports the dispute.',
          confidence: 0.82,
        },
      },
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'completed', secret),
    })

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    const dispute = (await db
      .from('sprint_review_disputes')
      .where('id', disputeId)
      .first()) as SprintReviewDisputeRow | null

    assert.equal(result.id, evaluationId)
    assert.equal(result.dispute_id, disputeId)
    assert.equal(result.status, 'completed')
    assert.equal(evaluation?.status, 'completed')
    assert.equal(evaluation?.recommendation, 'partially_accept')
    assert.equal(Number(evaluation?.confidence_score), 0.82)
    assert.equal(dispute?.status, 'admin_reviewing')
  })

  test('sprint reverse workflow callback transitions reverse source back to reported', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const workflowId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: testId(),
      project_id: testId(),
      organization_id: testId(),
      reviewer_id: testId(),
      target_type: 'environment',
      target_user_id: null,
      target_entity_id: testId(),
      responder_id: testId(),
      status: 'ai_reviewing',
      rating: 2,
      comment: 'Environment review needs AI arbitration.',
      package_id: null,
      submitted_at: '2026-07-14T02:00:00.000Z',
      accepted_at: null,
      reported_at: '2026-07-14T03:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
    await db.table('ai_dispute_evaluations').insert({
      id: evaluationId,
      dispute_id: workflowId,
      case_file_id: null,
      source_type: 'sprint_reverse_review_workflow',
      source_id: workflowId,
      provider: 'ai_council',
      status: 'processing',
      request_payload: JSON.stringify({ dispute_review_type: 'environment_review' }),
    })

    const result = await command.execute({
      evaluation_id: evaluationId,
      source_id: workflowId,
      status: 'completed',
      response_payload: {
        verdict: {
          final_decision: 'partially_accept',
          rationale: 'Environment review needs partial adjustment.',
          confidence_score: 0.79,
        },
      },
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'completed', secret),
    })

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    const workflow = (await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .first()) as SprintReverseReviewWorkflowRow | null

    assert.equal(result.id, evaluationId)
    assert.equal(result.dispute_id, workflowId)
    assert.equal(result.status, 'completed')
    assert.equal(evaluation?.status, 'completed')
    assert.equal(evaluation?.recommendation, 'partially_accept')
    assert.equal(Number(evaluation?.confidence_score), 0.79)
    assert.equal(workflow?.status, 'reported')
  })

  test('public callback accepts task review workflow alias and transitions source back to reported', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const workflowId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)

    await db.table('task_review_workflows').insert({
      id: workflowId,
      task_id: testId(),
      project_id: testId(),
      organization_id: testId(),
      reviewee_id: testId(),
      status: 'ai_reviewing',
      reported_by: testId(),
      reported_at: '2026-07-14T03:00:00.000Z',
      runtime_context: JSON.stringify({
        source_type: 'task_review_workflow',
        dispute_review_type: 'task_review',
        task: { id: testId(), title: 'Task under disputed review' },
      }),
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
    await db.table('ai_dispute_evaluations').insert({
      id: evaluationId,
      dispute_id: workflowId,
      case_file_id: null,
      source_type: 'task_review_workflow',
      source_id: workflowId,
      provider: 'ai_council',
      status: 'processing',
      request_payload: JSON.stringify({ dispute_review_type: 'task_review' }),
    })

    const response = await client
      .post('/api/public/ai-disputes/callback')
      .header('accept', 'application/json')
      .header('X-Timestamp', String(timestamp))
      .header('X-Signature', signCallback(timestamp, evaluationId, 'completed', secret))
      .json({
        evaluationId,
        taskReviewWorkflowId: workflowId,
        status: 'completed',
        responsePayload: {
          verdict: {
            recommendation: 'adjust_score',
            rationale: 'Task workflow context supports score adjustment.',
            confidence: 0.84,
          },
        },
      })

    response.assertStatus(200)

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    const workflow = (await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .first()) as TaskReviewWorkflowRow | null

    assert.equal(evaluation?.status, 'completed')
    assert.equal(evaluation?.recommendation, 'adjust_score')
    assert.equal(Number(evaluation?.confidence_score), 0.84)
    assert.equal(workflow?.status, 'reported')
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

    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null
    assert.equal(evaluation?.status, 'queued')
  })

  test('duplicate callback on finished evaluation is rejected', async ({ assert }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const { evaluationId } = await seedEvaluation({ evaluationStatus: 'completed' })
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand()

    const before = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .select('status', 'completed_at')
      .first()) as { status: string; completed_at: string | null } | null

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

    const after = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .select('status', 'completed_at')
      .first()) as { status: string; completed_at: string | null } | null
    assert.deepEqual(after, before)
  })
})
