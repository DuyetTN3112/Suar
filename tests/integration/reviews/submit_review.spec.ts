import { randomUUID } from 'node:crypto'
import { test } from '@japa/runner'
import SubmitSkillReviewCommand from '#actions/reviews/commands/submit_skill_review_command'
import { SubmitSkillReviewDTO } from '#actions/reviews/dtos/request/review_dtos'
import { ReviewSessionStatus } from '#constants/review_constants'
import { ProficiencyLevel } from '#constants/user_constants'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ConflictException from '#exceptions/conflict_exception'
import NotFoundException from '#exceptions/not_found_exception'
import AuditLog from '#models/mongo/audit_log'
import ReviewSession from '#models/review_session'
import SkillReview from '#models/skill_review'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Submit Review', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createReviewSetup() {
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
      status: 'pending',
      required_peer_reviews: 2,
    })
    const skill1 = await SkillFactory.create({ skill_name: 'JavaScript' })
    const skill2 = await SkillFactory.create({ skill_name: 'TypeScript' })

    return { owner, reviewer, session, skill1, skill2 }
  }

  async function submitReview(input: {
    actorId: string
    reviewSessionId: string
    reviewerType: 'manager' | 'peer'
    skillRatings: Array<{
      skill_id: string
      assigned_level_code: string
      comment?: string
    }>
    overall_quality_score?: number
    delivery_timeliness?: string
    requirement_adherence?: number
    communication_quality?: number
    code_quality_score?: number
    proactiveness_score?: number
    would_work_with_again?: boolean
    strengths_observed?: string
    areas_for_improvement?: string
  }) {
    const command = new SubmitSkillReviewCommand(ExecutionContext.system(input.actorId))

    return command.handle(
      new SubmitSkillReviewDTO({
        review_session_id: input.reviewSessionId,
        reviewer_type: input.reviewerType,
        skill_ratings: input.skillRatings,
        overall_quality_score: input.overall_quality_score,
        delivery_timeliness: input.delivery_timeliness,
        requirement_adherence: input.requirement_adherence,
        communication_quality: input.communication_quality,
        code_quality_score: input.code_quality_score,
        proactiveness_score: input.proactiveness_score,
        would_work_with_again: input.would_work_with_again,
        strengths_observed: input.strengths_observed,
        areas_for_improvement: input.areas_for_improvement,
      })
    )
  }

  test('manager submission persists reviews, manager dimensions, and audit state', async ({
    assert,
  }) => {
    const { owner, session, skill1, skill2 } = await createReviewSetup()

    const reviews = await submitReview({
      actorId: owner.id,
      reviewSessionId: session.id,
      reviewerType: 'manager',
      skillRatings: [
        {
          skill_id: skill1.id,
          assigned_level_code: ProficiencyLevel.SENIOR,
          comment: 'Strong implementation quality',
        },
        {
          skill_id: skill2.id,
          assigned_level_code: ProficiencyLevel.LEAD,
        },
      ],
      overall_quality_score: 5,
      delivery_timeliness: 'on_time',
      requirement_adherence: 5,
      communication_quality: 4,
      code_quality_score: 5,
      proactiveness_score: 4,
      would_work_with_again: true,
      strengths_observed: 'Reliable delivery',
      areas_for_improvement: 'Share more updates early',
    })

    const updatedSession = await ReviewSession.findOrFail(session.id)
    const savedReviews = await SkillReview.query()
      .where('review_session_id', session.id)
      .where('reviewer_id', owner.id)
      .orderBy('created_at', 'asc')
    const logs = await AuditLog.find({
      entity_type: 'review_session',
      entity_id: session.id,
      action: 'submit_review',
    })

    assert.lengthOf(reviews, 2)
    assert.lengthOf(savedReviews, 2)
    assert.equal(savedReviews[0]?.reviewer_type, 'manager')
    assert.isTrue(updatedSession.manager_review_completed)
    assert.equal(updatedSession.overall_quality_score, 5)
    assert.equal(updatedSession.delivery_timeliness, 'on_time')
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
    assert.isAbove(logs.length, 0)
  })

  test('peer submission increments counters and rejects duplicate reviewers', async ({
    assert,
  }) => {
    const { reviewer, session, skill1 } = await createReviewSetup()

    await submitReview({
      actorId: reviewer.id,
      reviewSessionId: session.id,
      reviewerType: 'peer',
      skillRatings: [
        {
          skill_id: skill1.id,
          assigned_level_code: ProficiencyLevel.MIDDLE,
        },
      ],
    })

    await assert.rejects(
      () =>
        submitReview({
          actorId: reviewer.id,
          reviewSessionId: session.id,
          reviewerType: 'peer',
          skillRatings: [
            {
              skill_id: skill1.id,
              assigned_level_code: ProficiencyLevel.SENIOR,
            },
          ],
        }),
      ConflictException
    )

    const updatedSession = await ReviewSession.findOrFail(session.id)
    assert.equal(updatedSession.peer_reviews_count, 1)
    assert.equal(updatedSession.status, ReviewSessionStatus.IN_PROGRESS)
  })

  test('session completes only after manager review and the required peer reviews land', async ({
    assert,
  }) => {
    const { owner, session, skill1 } = await createReviewSetup()
    const peer1 = await UserFactory.create()
    const peer2 = await UserFactory.create()

    await submitReview({
      actorId: owner.id,
      reviewSessionId: session.id,
      reviewerType: 'manager',
      skillRatings: [
        {
          skill_id: skill1.id,
          assigned_level_code: ProficiencyLevel.SENIOR,
        },
      ],
    })
    await submitReview({
      actorId: peer1.id,
      reviewSessionId: session.id,
      reviewerType: 'peer',
      skillRatings: [
        {
          skill_id: skill1.id,
          assigned_level_code: ProficiencyLevel.MIDDLE,
        },
      ],
    })
    await submitReview({
      actorId: peer2.id,
      reviewSessionId: session.id,
      reviewerType: 'peer',
      skillRatings: [
        {
          skill_id: skill1.id,
          assigned_level_code: ProficiencyLevel.LEAD,
        },
      ],
    })

    const completedSession = await ReviewSession.findOrFail(session.id)
    assert.equal(completedSession.status, ReviewSessionStatus.COMPLETED)
    assert.isTrue(completedSession.manager_review_completed)
    assert.equal(completedSession.peer_reviews_count, 2)
    assert.isNotNull(completedSession.completed_at)
  })

  test('invalid skill ratings are rejected before any review rows are persisted', async ({
    assert,
  }) => {
    const invalidCases = [
      async () => {
        const { reviewer, session } = await createReviewSetup()
        return {
          sessionId: session.id,
          errorType: NotFoundException,
          execute: () =>
            submitReview({
              actorId: reviewer.id,
              reviewSessionId: session.id,
              reviewerType: 'peer',
              skillRatings: [
                {
                  skill_id: randomUUID(),
                  assigned_level_code: ProficiencyLevel.MIDDLE,
                },
              ],
            }),
        }
      },
      async () => {
        const { reviewer, session } = await createReviewSetup()
        const inactiveSkill = await SkillFactory.create({ is_active: false })
        return {
          sessionId: session.id,
          errorType: BusinessLogicException,
          execute: () =>
            submitReview({
              actorId: reviewer.id,
              reviewSessionId: session.id,
              reviewerType: 'peer',
              skillRatings: [
                {
                  skill_id: inactiveSkill.id,
                  assigned_level_code: ProficiencyLevel.MIDDLE,
                },
              ],
            }),
        }
      },
      async () => {
        const { reviewer, session, skill1 } = await createReviewSetup()
        return {
          sessionId: session.id,
          errorType: BusinessLogicException,
          execute: () =>
            submitReview({
              actorId: reviewer.id,
              reviewSessionId: session.id,
              reviewerType: 'peer',
              skillRatings: [
                {
                  skill_id: skill1.id,
                  assigned_level_code: 'invalid_level',
                },
              ],
            }),
        }
      },
    ]

    for (const createCase of invalidCases) {
      const scenario = await createCase()
      await assert.rejects(() => scenario.execute(), scenario.errorType)
      const persistedReviews = await SkillReview.query().where(
        'review_session_id',
        scenario.sessionId
      )
      assert.lengthOf(persistedReviews, 0)
    }
  })
})
