import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { reviewPublicApi } from '#composition/reviews/public-api/review_public_api_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Talent Explainability Projection V1', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('domain_event_outbox_replay_history').delete()
    await db.from('domain_event_outbox').delete()
    await cleanupTestData()
  })

  test('backfill stages durable projection events instead of acknowledging direct writes', async ({
    assert,
  }) => {
    const [firstUser, secondUser] = await Promise.all([
      UserFactory.create(),
      UserFactory.create(),
    ])
    const occurredAt = '2026-07-26T12:00:00.000Z'

    const staged = await reviewPublicApi.stageTalentExplainabilityProjectionBackfillV1(
      [secondUser.id, firstUser.id],
      occurredAt
    )

    const rows = (await db
      .from('domain_event_outbox')
      .where('event_name', 'reviews:talent-explainability-projection:changed:v1')
      .orderBy('aggregate_id', 'asc')) as Array<{
      aggregate_id: string
      status: string
      payload: { occurredAt: string }
    }>
    assert.equal(staged, 2)
    assert.lengthOf(rows, 2)
    assert.deepEqual(
      rows.map((row) => row.aggregate_id),
      [firstUser.id, secondUser.id].sort()
    )
    assert.isTrue(rows.every((row) => row.status === 'pending'))
    assert.isTrue(rows.every((row) => row.payload.occurredAt === occurredAt))
  })

  test('applies finality policy and counts only publishable skills under active dispute', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
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
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      confirmations: [
        {
          user_id: reviewee.id,
          action: 'confirmed',
          created_at: DateTime.now().toISO(),
        },
      ],
    })
    const includedSkill = await SkillFactory.create()
    const excludedSkill = await SkillFactory.create()
    const includedRatingId = testId()

    await db.table('skill_reviews').insert([
      {
        id: includedRatingId,
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'peer',
        skill_id: includedSkill.id,
        assigned_public_proficiency_code: 'l7',
        review_status: 'submitted',
        is_fraud: false,
        confidence: 'high',
        submitted_at: DateTime.now().minus({ minutes: 1 }).toSQL(),
      },
      {
        id: testId(),
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'peer',
        skill_id: excludedSkill.id,
        assigned_public_proficiency_code: 'l6',
        review_status: 'draft',
        is_fraud: false,
        confidence: 'medium',
      },
      {
        id: testId(),
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'manager',
        skill_id: excludedSkill.id,
        assigned_public_proficiency_code: 'l8',
        review_status: 'submitted',
        is_fraud: true,
        confidence: 'low',
      },
      {
        id: testId(),
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'manager',
        skill_id: excludedSkill.id,
        assigned_public_proficiency_code: 'l9',
        review_status: 'submitted',
        is_fraud: false,
        superseded_by: includedRatingId,
        confidence: 'medium',
      },
    ])

    let projections = await reviewPublicApi.listTalentExplainabilityProjectionsV1([
      reviewee.id,
    ])
    let projection = projections[0]
    assert.equal(projection?.underDisputeSkillsCount, 0)
    assert.equal(projection?.latestConfidenceSignal, 'high')

    session.status = 'disputed'
    session.confirmations = [
      {
        user_id: reviewee.id,
        action: 'disputed',
        created_at: DateTime.now().toISO(),
      },
    ]
    await session.save()
    await db.table('review_disputes').insert({
      id: testId(),
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'pending',
      dispute_reason: 'Needs investigation',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([{ skill_review_id: includedRatingId }]),
      requested_outcome: 'adjust_score',
    })

    projections = await reviewPublicApi.listTalentExplainabilityProjectionsV1([reviewee.id])
    projection = projections[0]
    assert.equal(projection?.underDisputeSkillsCount, 1)
    assert.isNull(projection?.latestConfidenceSignal)
  })

  test('returns an empty fail-closed projection for malformed user identifiers', async ({
    assert,
  }) => {
    const [projection] = await reviewPublicApi.listTalentExplainabilityProjectionsV1([
      'not-a-user-id',
    ])

    assert.deepInclude(projection, {
      contractVersion: 1,
      revieweeUserId: 'not-a-user-id',
      underDisputeSkillsCount: 0,
      latestConfidenceSignal: null,
    })
    assert.match(projection?.sourceRevision ?? '', /^\d+$/)
  })
})
