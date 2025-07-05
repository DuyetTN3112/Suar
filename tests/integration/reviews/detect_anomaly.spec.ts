import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import DetectAnomalyCommand from '#actions/reviews/commands/detect_anomaly_command'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'
import User from '#models/user'

test.group('Integration | Detect Anomaly', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createBaseSetup() {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create()
    const reviewee = await UserFactory.create()
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
    })
    return { owner, reviewer, reviewee, session }
  }

  async function setCreatedAt(userId: string, daysAgo: number) {
    await User.query()
      .where('id', userId)
      .update({ created_at: DateTime.now().minus({ days: daysAgo }) })
  }

  async function runDetection(reviewerId: string, reviewSessionId: string) {
    const command = new DetectAnomalyCommand(ExecutionContext.system(reviewerId))
    return command.handle({ reviewSessionId, reviewerId })
  }

  test('flags bulk same level reviews when one level dominates the submission', async ({
    assert,
  }) => {
    const { reviewer, reviewee, session, owner } = await createBaseSetup()
    await setCreatedAt(reviewee.id, 45)

    const skills = await Promise.all([
      SkillFactory.create({ skill_name: 'JavaScript' }),
      SkillFactory.create({ skill_name: 'TypeScript' }),
      SkillFactory.create({ skill_name: 'Node.js' }),
    ])

    await Promise.all(
      skills.map((skill) =>
        SkillReviewFactory.create({
          review_session_id: session.id,
          reviewer_id: reviewer.id,
          reviewer_type: 'peer',
          skill_id: skill.id,
          assigned_level_code: 'senior',
          comment: `reviewed by ${owner.username}`,
        })
      )
    )

    const flaggedReviews = await runDetection(reviewer.id, session.id)

    assert.lengthOf(flaggedReviews, 1)
    assert.equal(flaggedReviews[0]?.flag_type, 'bulk_same_level')
    assert.equal(flaggedReviews[0]?.status, 'pending')
  })

  test('flags new account high reviews for a young account', async ({ assert }) => {
    const { reviewer, session } = await createBaseSetup()
    const skill = await SkillFactory.create({ skill_name: 'Rust' })

    const [review] = await Promise.all([
      SkillReviewFactory.create({
        review_session_id: session.id,
        reviewer_id: reviewer.id,
        reviewer_type: 'peer',
        skill_id: skill.id,
        assigned_level_code: 'master',
      }),
    ])

    const flaggedReviews = await runDetection(reviewer.id, session.id)

    assert.lengthOf(flaggedReviews, 1)
    assert.equal(flaggedReviews[0]?.flag_type, 'new_account_high')
    assert.equal(flaggedReviews[0]?.skill_review_id, review.id)
  })

  test('flags mutual high reviews when users repeatedly rate each other highly', async ({
    assert,
  }) => {
    const { reviewer, reviewee, session } = await createBaseSetup()
    await setCreatedAt(reviewee.id, 45)

    const reverseSkill = await SkillFactory.create({ skill_name: 'Go' })
    for (let index = 0; index < 3; index += 1) {
      const reverseTask = await TaskFactory.create()
      const reverseAssignment = await TaskAssignmentFactory.create({
        task_id: reverseTask.id,
        assignee_id: reviewer.id,
        assignment_status: 'completed',
      })
      const reverseSession = await ReviewSessionFactory.create({
        task_assignment_id: reverseAssignment.id,
        reviewee_id: reviewer.id,
        status: 'completed',
      })

      await SkillReviewFactory.create({
        review_session_id: reverseSession.id,
        reviewer_id: reviewee.id,
        reviewer_type: 'peer',
        skill_id: reverseSkill.id,
        assigned_level_code: index === 0 ? 'lead' : 'senior',
      })
    }

    const currentReview = await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'peer',
      skill_id: reverseSkill.id,
      assigned_level_code: 'lead',
    })

    const flaggedReviews = await runDetection(reviewer.id, session.id)

    assert.lengthOf(flaggedReviews, 1)
    assert.equal(flaggedReviews[0]?.flag_type, 'mutual_high')
    assert.equal(flaggedReviews[0]?.skill_review_id, currentReview.id)
  })
})
