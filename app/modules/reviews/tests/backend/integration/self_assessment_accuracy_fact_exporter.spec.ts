import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Self-assessment Accuracy Fact Exporter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('exports only confirmed or resolved facts in the requested period', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const confirmedAt = DateTime.utc(2026, 7, 12, 10)
    const resolvedAt = DateTime.utc(2026, 7, 13, 10)

    const createAssignment = async () => {
      const task = await TaskFactory.create({
        organization_id: org.id,
        creator_id: owner.id,
      })
      const assignment = await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: reviewee.id,
        assigned_by: owner.id,
        assignment_status: 'completed',
      })
      return { task, assignment }
    }

    const createAssessment = async (taskAssignmentId: string, overallSatisfaction: number) => {
      await db.table('task_self_assessments').insert({
        id: testId(),
        task_assignment_id: taskAssignmentId,
        user_id: reviewee.id,
        overall_satisfaction: overallSatisfaction,
        what_went_well: 'private narrative',
      })
    }

    const confirmed = await createAssignment()
    const confirmedSession = await ReviewSessionFactory.create({
      task_assignment_id: confirmed.assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      confirmations: [
        {
          user_id: reviewee.id,
          action: 'confirmed',
          created_at: confirmedAt.toISO() ?? '',
        },
      ],
      completed_at: confirmedAt,
    })
    confirmedSession.overall_quality_score = 5
    await confirmedSession.save()
    await createAssessment(confirmed.assignment.id, 4)

    const resolved = await createAssignment()
    const resolvedSession = await ReviewSessionFactory.create({
      task_assignment_id: resolved.assignment.id,
      reviewee_id: reviewee.id,
      status: 'disputed',
      confirmations: [
        {
          user_id: reviewee.id,
          action: 'disputed',
          created_at: resolvedAt.toISO() ?? '',
        },
      ],
      completed_at: resolvedAt,
    })
    resolvedSession.overall_quality_score = 4
    await resolvedSession.save()
    await createAssessment(resolved.assignment.id, 3)
    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: resolvedSession.id,
      task_assignment_id: resolved.assignment.id,
      task_id: resolved.task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'resolved',
      dispute_reason: 'Score needs adjustment',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
      final_decision: 'adjust_score',
      resolved_at: resolvedAt.toJSDate(),
    })

    const unconfirmed = await createAssignment()
    const unconfirmedSession = await ReviewSessionFactory.create({
      task_assignment_id: unconfirmed.assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      confirmations: [],
      completed_at: DateTime.utc(2026, 7, 14, 10),
    })
    unconfirmedSession.overall_quality_score = 5
    await unconfirmedSession.save()
    await createAssessment(unconfirmed.assignment.id, 5)

    const active = await createAssignment()
    const activeSession = await ReviewSessionFactory.create({
      task_assignment_id: active.assignment.id,
      reviewee_id: reviewee.id,
      status: 'disputed',
      confirmations: [
        {
          user_id: reviewee.id,
          action: 'disputed',
          created_at: DateTime.utc(2026, 7, 15, 10).toISO() ?? '',
        },
      ],
      completed_at: DateTime.utc(2026, 7, 15, 10),
    })
    activeSession.overall_quality_score = 2
    await activeSession.save()
    await createAssessment(active.assignment.id, 4)
    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: activeSession.id,
      task_assignment_id: active.assignment.id,
      task_id: active.task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'pending',
      dispute_reason: 'Needs investigation',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'adjust_score',
    })

    const outside = await createAssignment()
    const outsideSession = await ReviewSessionFactory.create({
      task_assignment_id: outside.assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      confirmations: [
        {
          user_id: reviewee.id,
          action: 'confirmed',
          created_at: DateTime.utc(2026, 7, 21, 10).toISO() ?? '',
        },
      ],
      completed_at: DateTime.utc(2026, 7, 21, 10),
    })
    outsideSession.overall_quality_score = 5
    await outsideSession.save()
    await createAssessment(outside.assignment.id, 5)

    const facts = await reviewPublicApi.listSelfAssessmentAccuracyFactsV1(
      reviewee.id,
      {
        periodStart: '2026-07-10T00:00:00.000Z',
        periodEnd: '2026-07-20T00:00:00.000Z',
      }
    )

    assert.deepEqual(facts, [
      {
        taskAssignmentId: confirmed.assignment.id,
        selfScore: 4,
        reviewedScore: 5,
        reviewCompletedAt: confirmedAt.toISO(),
      },
      {
        taskAssignmentId: resolved.assignment.id,
        selfScore: 3,
        reviewedScore: 4,
        reviewCompletedAt: resolvedAt.toISO(),
      },
    ])
    assert.notInclude(JSON.stringify(facts), 'private narrative')
  })

  test('fails closed for invalid user and period inputs', async ({ assert }) => {
    assert.deepEqual(
      await reviewPublicApi.listSelfAssessmentAccuracyFactsV1('not-a-uuid', {}),
      []
    )
    assert.deepEqual(
      await reviewPublicApi.listSelfAssessmentAccuracyFactsV1(testId(), {
        periodStart: 'invalid',
      }),
      []
    )
  })
})
