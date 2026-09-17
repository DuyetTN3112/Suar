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

async function createCompletedAssignment() {
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

  return { owner, reviewee, reviewer, task, assignment }
}

test.group('Integration | Profile Review Fact Exporter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('exports only submitted non-fraud ratings and verified non-sensitive evidence', async ({
    assert,
  }) => {
    const { reviewee, reviewer, assignment } = await createCompletedAssignment()
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
    session.overall_quality_score = 4
    await session.save()

    const includedSkill = await SkillFactory.create({ skill_name: 'Included Skill' })
    const excludedSkill = await SkillFactory.create({ skill_name: 'Excluded Skill' })
    const includedRatingId = testId()
    const supersededRatingId = testId()
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
        comment: 'must never leave Reviews',
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
      },
      {
        id: supersededRatingId,
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'manager',
        skill_id: excludedSkill.id,
        assigned_public_proficiency_code: 'l9',
        review_status: 'submitted',
        is_fraud: false,
        superseded_by: includedRatingId,
      },
    ])

    const includedEvidenceId = testId()
    await db.table('review_evidences').insert([
      {
        id: includedEvidenceId,
        review_session_id: session.id,
        evidence_type: 'pull_request',
        url: 'https://example.test/safe',
        title: 'Safe evidence',
        uploaded_by: reviewer.id,
        verification_status: 'verified',
        is_sensitive: false,
      },
      {
        id: testId(),
        review_session_id: session.id,
        evidence_type: 'document_link',
        url: 'https://example.test/unverified',
        title: 'Unverified evidence',
        uploaded_by: reviewer.id,
        verification_status: 'pending',
        is_sensitive: false,
      },
      {
        id: testId(),
        review_session_id: session.id,
        evidence_type: 'document_link',
        url: 'https://example.test/private',
        title: 'Sensitive evidence',
        uploaded_by: reviewer.id,
        verification_status: 'verified',
        is_sensitive: true,
      },
    ])
    await db.table('task_self_assessments').insert({
      id: testId(),
      task_assignment_id: assignment.id,
      user_id: reviewee.id,
      what_went_well: 'Private retrospective',
      what_would_do_different: 'Private improvement note',
    })

    const facts = await reviewPublicApi.listProfileReviewFactsV1(reviewee.id, [assignment.id])
    const fact = facts[0]

    assert.exists(fact)
    assert.equal(fact?.disposition, 'replacement')
    if (!fact || fact.disposition !== 'replacement') return

    assert.equal(fact.reason, 'reviewee_confirmed')
    assert.equal(fact.overallQualityScore, 4)
    assert.deepEqual(fact.skillRatings, [
      {
        skillReviewId: includedRatingId,
        skillId: includedSkill.id,
        assignedPublicProficiencyCode: 'l7',
        reviewerType: 'peer',
      },
    ])
    assert.deepEqual(fact.evidences, [
      {
        evidenceId: includedEvidenceId,
        evidenceType: 'pull_request',
        url: 'https://example.test/safe',
        title: 'Safe evidence',
      },
    ])
    assert.notProperty(fact.skillRatings[0] ?? {}, 'comment')
    assert.notProperty(fact.skillRatings[0] ?? {}, 'reviewerId')
    assert.notProperty(fact, 'knowledgeArtifacts')
    assert.notInclude(JSON.stringify(fact), 'Private retrospective')
  })

  test('emits fail-closed tombstones for missing confirmation and dispute transitions', async ({
    assert,
  }) => {
    const { reviewee, assignment, task } = await createCompletedAssignment()
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: 'completed',
      confirmations: [],
    })

    let facts = await reviewPublicApi.listProfileReviewFactsV1(reviewee.id, [assignment.id])
    let fact = facts[0]
    assert.equal(fact?.disposition, 'tombstone')
    assert.equal(fact?.reason, 'reviewee_confirmation_missing')

    session.status = 'disputed'
    session.confirmations = [
      {
        user_id: reviewee.id,
        action: 'disputed',
        created_at: DateTime.now().toISO(),
      },
    ]
    await session.save()

    const disputeId = testId()
    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: session.id,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: reviewee.id,
      opened_by: reviewee.id,
      status: 'pending',
      dispute_reason: 'Needs investigation',
      disputed_dimensions: JSON.stringify({}),
      disputed_skill_reviews: JSON.stringify([]),
      requested_outcome: 'request_re_review',
    })

    facts = await reviewPublicApi.listProfileReviewFactsV1(reviewee.id, [assignment.id])
    fact = facts[0]
    assert.equal(fact?.disposition, 'tombstone')
    assert.equal(fact?.reason, 'active_dispute')

    await db
      .from('review_disputes')
      .where('id', disputeId)
      .update({
        status: 'resolved',
        final_decision: 'request_re_review',
        resolved_at: db.raw('NOW()'),
        updated_at: db.raw('NOW()'),
      })

    facts = await reviewPublicApi.listProfileReviewFactsV1(reviewee.id, [assignment.id])
    fact = facts[0]
    assert.equal(fact?.disposition, 'tombstone')
    assert.equal(fact?.reason, 'request_re_review')

    await db
      .from('review_disputes')
      .where('id', disputeId)
      .update({
        final_decision: 'adjust_score',
        updated_at: db.raw('NOW()'),
      })

    facts = await reviewPublicApi.listProfileReviewFactsV1(reviewee.id, [assignment.id])
    fact = facts[0]
    assert.equal(fact?.disposition, 'replacement')
    assert.equal(fact?.reason, 'resolved_dispute_publishable')
  })
})
