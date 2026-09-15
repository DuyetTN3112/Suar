import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  aiDisputeUnitOfWork,
  type AiDisputeEvaluationRow,
  reviewCryptography,
  signCallback,
  type SprintReverseReviewWorkflowRow,
  type SprintReviewDisputeRow,
  type TaskReviewWorkflowRow,
} from './support/ai_dispute_callback_test_support.js'

import ProcessAiDisputeCallbackCommand from '#modules/disputes/actions/commands/process_ai_dispute_callback_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Public | AI Dispute Callback - Workflow Sources', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    delete process.env['AI_CALLBACK_SECRET']
    await cleanupTestData()
  })

  test('sprint review dispute callback transitions sprint source back to admin review', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
    const disputeId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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
    const command = new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork)

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
    assert.equal(workflow?.status, 'admin_reviewing')
  })

  test('public callback accepts task review workflow alias and transitions source to admin review', async ({
    assert,
    client,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
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
    const workflowId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)

    await db.table('task_review_workflows').insert({
      id: workflowId,
      task_id: task.id,
      task_assignment_id: assignment.id,
      project_id: task.project_id,
      organization_id: org.id,
      reviewee_id: reviewee.id,
      status: 'ai_reviewing',
      reported_by: reviewee.id,
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
    assert.equal(workflow?.status, 'admin_reviewing')
  })

  test('failed task review AI callback keeps the dispute in the retry-required state', async ({
    assert,
  }) => {
    const secret = 'callback-secret'
    process.env['AI_CALLBACK_SECRET'] = secret
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
    const workflowId = testId()
    const evaluationId = testId()
    const timestamp = Math.floor(Date.now() / 1000)

    await db.table('task_review_workflows').insert({
      id: workflowId,
      task_id: task.id,
      task_assignment_id: assignment.id,
      project_id: task.project_id,
      organization_id: org.id,
      reviewee_id: reviewee.id,
      status: 'ai_reviewing',
      reported_by: reviewee.id,
      reported_at: '2026-07-14T03:00:00.000Z',
      runtime_context: JSON.stringify({ source_type: 'task_review_workflow' }),
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
    await db.table('ai_dispute_evaluations').insert({
      id: evaluationId,
      dispute_id: workflowId,
      case_file_id: null,
      source_type: 'task_review_workflow',
      source_id: workflowId,
      provider: 'clawagent',
      status: 'processing',
      request_payload: JSON.stringify({ dispute_review_type: 'task_review' }),
    })

    await new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork).execute({
      evaluation_id: evaluationId,
      source_id: workflowId,
      status: 'failed',
      error_message: 'LLM call failed with HTTP 429: quota exceeded',
      timestamp,
      signature: signCallback(timestamp, evaluationId, 'failed', secret),
    })

    const workflow = (await db
      .from('task_review_workflows')
      .where('id', workflowId)
      .first()) as TaskReviewWorkflowRow | null
    const evaluation = (await db
      .from('ai_dispute_evaluations')
      .where('id', evaluationId)
      .first()) as AiDisputeEvaluationRow | null

    assert.equal(workflow?.status, 'ai_failed')
    assert.equal(evaluation?.status, 'failed')
  })
})
