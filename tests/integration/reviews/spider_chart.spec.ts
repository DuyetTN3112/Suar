import { test } from '@japa/runner'

import RecalculateRevieweeSkillScoresCommand from '#actions/reviews/commands/recalculate_reviewee_skill_scores_command'
import UserSkill from '#infra/users/models/user_skill'
import { ReviewSessionStatus } from '#modules/reviews/constants/review_constants'
import { ProficiencyLevel } from '#modules/users/constants/user_constants'
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
import { ExecutionContext } from '#types/execution_context'

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
      assigned_level_code: input.assignedLevel ?? ProficiencyLevel.SENIOR,
    })

    return { reviewee, skill }
  }

  test('completed review signals are materialized into reviewed user_skill aggregates', async ({
    assert,
  }) => {
    const { reviewee, skill } = await createReviewSignal()
    const command = new RecalculateRevieweeSkillScoresCommand(ExecutionContext.system(reviewee.id))

    const result = await command.handle({ userId: reviewee.id })
    const userSkill = await UserSkill.query()
      .where('user_id', reviewee.id)
      .where('skill_id', skill.id)
      .firstOrFail()

    assert.equal(result.skillsUpdated, 1)
    assert.equal(userSkill.level_code, ProficiencyLevel.SENIOR)
    assert.equal(userSkill.total_reviews, 1)
    assert.equal(userSkill.avg_percentage, 57.1)
    assert.equal(userSkill.avg_score, 57.1)
    assert.equal(userSkill.source, 'reviewed')
    assert.isNotNull(userSkill.last_calculated_at)
    assert.isNotNull(userSkill.last_reviewed_at)
  })

  test('recalculation updates an existing user_skill row and ignores incomplete sessions', async ({
    assert,
  }) => {
    const completed = await createReviewSignal({ assignedLevel: ProficiencyLevel.LEAD })
    await createReviewSignal({
      sessionStatus: ReviewSessionStatus.PENDING,
      assignedLevel: ProficiencyLevel.MASTER,
    })

    await UserSkillFactory.create({
      user_id: completed.reviewee.id,
      skill_id: completed.skill.id,
      level_code: ProficiencyLevel.BEGINNER,
      total_reviews: 0,
      avg_percentage: 10,
      avg_score: 10,
    })

    const command = new RecalculateRevieweeSkillScoresCommand(
      ExecutionContext.system(completed.reviewee.id)
    )

    const result = await command.handle({ userId: completed.reviewee.id })
    const rows = await UserSkill.query()
      .where('user_id', completed.reviewee.id)
      .where('skill_id', completed.skill.id)

    assert.equal(result.skillsUpdated, 1)
    assert.lengthOf(rows, 1)
    assert.equal(rows[0]?.level_code, ProficiencyLevel.LEAD)
    assert.equal(rows[0]?.total_reviews, 1)
    assert.equal(rows[0]?.avg_percentage, 71.4)
  })
})
