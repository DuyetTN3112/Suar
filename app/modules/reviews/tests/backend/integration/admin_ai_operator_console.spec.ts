import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  aiDisputeEvaluationSourceReader,
  reviewAdminDisputeReadModel,
} from '#composition/review_action_factory'
import { makeSystemAdminActionContext } from '#modules/admin/disputes/actions/action_context'
import GetAdminReviewDisputeAiOperatorOverviewQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_ai_operator_overview_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Admin AI operator console', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('collapses provider labels and surfaces the newest failed reason', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create({ current_organization_id: org.id })

    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewee.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      title: 'Operator console task',
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
    const disputeId = '4f8d5c71-4c0e-4c95-9f10-9ec07ed7d6bd'

    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: reviewSession.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: owner.id,
      status: 'admin_reviewing',
      dispute_reason: 'Need operator visibility.',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify(['quality']),
      disputed_skill_reviews: JSON.stringify([]),
      reported_to_admin_at: '2026-07-01T00:00:00.000Z',
      reported_to_admin_by: reviewee.id,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    })
    await db.table('ai_dispute_evaluations').insert([
      {
        id: '8d59c0e8-8f1b-47f5-9b39-5d3ed6a14a3d',
        dispute_id: disputeId,
        case_file_id: null,
        source_type: 'review_dispute',
        source_id: disputeId,
        provider: 'ai_council',
        external_run_id: 'run-legacy',
        status: 'failed',
        request_payload: JSON.stringify({ dispute_id: disputeId }),
        error_message: 'AI_COUNCIL_TIMEOUT: old queue',
        created_at: '2026-07-01T00:01:00.000Z',
      },
      {
        id: 'c147b836-ecf1-4f7c-94c9-3a5d8a6b8d22',
        dispute_id: disputeId,
        case_file_id: null,
        source_type: 'review_dispute',
        source_id: disputeId,
        provider: 'clawagent',
        external_run_id: 'run-current',
        status: 'failed',
        request_payload: JSON.stringify({ dispute_id: disputeId }),
        error_message: 'CLAWAGENT_UNAVAILABLE: connection refused',
        created_at: '2026-07-01T00:02:00.000Z',
      },
    ])

    const result = await new GetAdminReviewDisputeAiOperatorOverviewQuery(
      makeSystemAdminActionContext(admin.id),
      aiDisputeEvaluationSourceReader,
      reviewAdminDisputeReadModel
    ).execute({ page: 1, perPage: 25 })

    assert.equal(result.metrics.providers.length, 1)
    assert.deepEqual(result.metrics.providers[0], {
      provider: 'clawagent',
      total: 2,
      active: 0,
      completed: 0,
      failed: 2,
    })
    assert.equal(
      result.disputes.data[0]?.last_error_message,
      'CLAWAGENT_UNAVAILABLE: connection refused'
    )
  })
})
