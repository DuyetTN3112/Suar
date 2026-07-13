import emitter from '@adonisjs/core/services/emitter'
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  makeCalculateSpiderChartCommand,
  makeRecalculateRevieweeSkillScoresCommand,
} from '#composition/reviews/review-core/review_action_factory'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { ReviewSessionStatus } from '#modules/reviews/public_contracts/review_constants'
import { getCanonicalProficiencyLevelValue } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_catalog'
import { CanonicalProficiencyLevelCode } from '#modules/skills/public_contracts/rubric-and-proficiency/proficiency_level_constants'
import UserSkill from '#modules/users/infra/models/profile-skills/user_skill'
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
  UserSkillFactory,
} from '#tests/helpers/factories'

test.group('Integration | Review Skill Recalculation', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function createReviewSignal(
    input: {
      sessionStatus?: ReviewSessionStatus
      assignedLevel?: string
    } = {}
  ) {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const reviewer = await UserFactory.create()
    const skill = await SkillFactory.create({ display_type: 'spider_chart' })
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: input.sessionStatus ?? ReviewSessionStatus.COMPLETED,
      manager_review_completed: true,
      peer_reviews_count: 0,
      required_peer_reviews: 0,
    })

    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: getCanonicalProficiencyLevelValue(
        input.assignedLevel ?? CanonicalProficiencyLevelCode.L10
      ),
    })

    return { reviewee, skill }
  }

  test('completed review signals are materialized into reviewed user_skill aggregates', async ({
    assert,
  }) => {
    const { reviewee, skill } = await createReviewSignal()
    const command = makeRecalculateRevieweeSkillScoresCommand(
      makeSystemReviewActionContext(reviewee.id)
    )

    const result = await command.handle({ userId: reviewee.id })
    const userSkill = await UserSkill.query()
      .where('user_id', reviewee.id)
      .where('skill_id', skill.id)
      .firstOrFail()

    assert.equal(result.skillsUpdated, 1)
    assert.equal(
      userSkill.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L10)
    )
    assert.equal(userSkill.total_reviews, 1)
    assert.equal(userSkill.avg_percentage, 71.4)
    assert.equal(userSkill.avg_score, 71.4)
    assert.equal(Number(userSkill.confidence), 0.294)
    assert.equal(userSkill.evidence_count, 0)
    assert.equal(userSkill.source, 'reviewed')
    assert.isNotNull(userSkill.last_calculated_at)
    assert.isNotNull(userSkill.last_reviewed_at)
  })

  test('recalculation updates an existing user_skill row and ignores incomplete sessions', async ({
    assert,
  }) => {
    const completed = await createReviewSignal({
      assignedLevel: CanonicalProficiencyLevelCode.L12,
    })
    await createReviewSignal({
      sessionStatus: ReviewSessionStatus.PENDING,
      assignedLevel: CanonicalProficiencyLevelCode.L14,
    })

    await UserSkillFactory.create({
      user_id: completed.reviewee.id,
      skill_id: completed.skill.id,
      verified_public_proficiency_code: getCanonicalProficiencyLevelValue(
        CanonicalProficiencyLevelCode.L1
      ),
      total_reviews: 0,
      avg_percentage: 10,
      avg_score: 10,
    })

    const command = makeRecalculateRevieweeSkillScoresCommand(
      makeSystemReviewActionContext(completed.reviewee.id)
    )

    const result = await command.handle({ userId: completed.reviewee.id })
    const rows = await UserSkill.query()
      .where('user_id', completed.reviewee.id)
      .where('skill_id', completed.skill.id)

    assert.equal(result.skillsUpdated, 1)
    assert.lengthOf(rows, 1)
    assert.equal(
      rows[0]?.verified_public_proficiency_code,
      getCanonicalProficiencyLevelValue(CanonicalProficiencyLevelCode.L12)
    )
    assert.equal(rows[0]?.total_reviews, 1)
    assert.equal(rows[0]?.avg_percentage, 85.7)
  })

  test('caller-owned transaction returns deferred events without publishing them', async ({
    assert,
  }) => {
    const { reviewee, skill } = await createReviewSignal()
    const command = makeRecalculateRevieweeSkillScoresCommand(
      makeSystemReviewActionContext(reviewee.id)
    )
    const events = emitter.fake(['skill:score:updated'])

    try {
      const result = await db.transaction((trx) =>
        command.handleInTransaction({ userId: reviewee.id }, trx)
      )

      assert.equal(result.userId, reviewee.id)
      assert.equal(result.skillsUpdated, 1)
      assert.deepEqual(result.deferredSkillScoreUpdatedEvents, [
        {
          userId: reviewee.id,
          skillId: skill.id,
          oldScore: null,
          newScore: 71.4,
        },
      ])
      events.assertNotEmitted('skill:score:updated')
    } finally {
      emitter.restore()
    }

    const persisted = await UserSkill.query()
      .where('user_id', reviewee.id)
      .where('skill_id', skill.id)
      .firstOrFail()
    assert.equal(persisted.avg_percentage, 71.4)
  })

  test('caller-owned transaction rejects an aborted recalculation before persisting', async ({
    assert,
  }) => {
    const { reviewee, skill } = await createReviewSignal()
    const command = makeRecalculateRevieweeSkillScoresCommand(
      makeSystemReviewActionContext(reviewee.id)
    )
    const controller = new AbortController()
    controller.abort()

    await assert.rejects(() =>
      db.transaction((trx) =>
        command.handleInTransaction(
          { userId: reviewee.id },
          trx,
          { signal: controller.signal }
        )
      )
    )

    const persisted = await UserSkill.query()
      .where('user_id', reviewee.id)
      .where('skill_id', skill.id)
      .first()
    assert.isNull(persisted)
  })

  test('spider chart calculation materializes default rows for a user with no review history', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ display_type: 'spider_chart' })

    const result = await makeCalculateSpiderChartCommand(
      makeSystemReviewActionContext(user.id)
    ).handle({ userId: user.id })

    const userSkill = await UserSkill.query()
      .where('user_id', user.id)
      .where('skill_id', skill.id)
      .firstOrFail()

    assert.equal(result.userId, user.id)
    assert.equal(result.skillsCalculated, 1)
    assert.equal(result.totalReviews, 0)
    assert.equal(userSkill.total_reviews, 0)
    assert.equal(Number(userSkill.avg_percentage), 0)
    assert.isTrue(Number.isFinite(Number(userSkill.avg_percentage)))
    assert.equal(userSkill.avg_score, null)
    assert.equal(userSkill.verified_public_proficiency_code, 'l0')
    assert.isNotNull(userSkill.last_calculated_at)
  })
})
