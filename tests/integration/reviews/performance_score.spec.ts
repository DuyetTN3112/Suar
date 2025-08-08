import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CalculatePerformanceScoreCommand from '#actions/reviews/commands/calculate_performance_score_command'
import { ReviewSessionStatus } from '#constants/review_constants'
import User from '#infra/users/models/user'
import UserPerformanceStat from '#infra/users/models/user_performance_stat'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  TaskFactory,
  TaskAssignmentFactory,
  ReviewSessionFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Performance Score', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('calculate performance score persists trust_data breakdown and lifetime performance stats', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const dueDate = DateTime.now().plus({ days: 3 })
    const completedAt = DateTime.now().plus({ days: 1 })

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: reviewee.id,
      difficulty: 'hard',
      due_date: dueDate,
    })

    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    assignment.actual_hours = 6
    assignment.completed_at = completedAt
    await assignment.save()

    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: reviewee.id,
      status: ReviewSessionStatus.COMPLETED,
      manager_review_completed: true,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
    })
    session.overall_quality_score = 4
    session.completed_at = completedAt
    await session.save()

    const command = new CalculatePerformanceScoreCommand(ExecutionContext.system(reviewee.id))
    const result = await command.handle({ userId: reviewee.id })

    const updatedUser = await User.findOrFail(reviewee.id)
    const stat = await UserPerformanceStat.query().where('user_id', reviewee.id).first()

    assert.isNotNull(updatedUser.trust_data)
    assert.isNotNull(stat)
    if (!updatedUser.trust_data || !stat) {
      assert.fail('Expected both trust_data and a lifetime performance stat row to be persisted')
      return
    }

    assert.equal(result.userId, reviewee.id)
    assert.equal(result.qualityScore, 80)
    assert.equal(result.deliveryScore, 100)
    assert.equal(result.difficultyBonus, 62.5)
    assert.equal(result.consistencyScore, 100)
    assert.isAtLeast(result.performanceScore, 0)
    assert.isAtMost(result.performanceScore, 100)

    assert.equal(updatedUser.trust_data.scoring_version, 'performance_v1')
    assert.equal(updatedUser.trust_data.performance_score, result.performanceScore)
    assert.equal(updatedUser.trust_data.performance_breakdown?.quality_score, result.qualityScore)
    assert.equal(updatedUser.trust_data.performance_breakdown?.delivery_score, result.deliveryScore)
    assert.equal(
      updatedUser.trust_data.performance_breakdown?.difficulty_bonus,
      result.difficultyBonus
    )
    assert.equal(
      updatedUser.trust_data.performance_breakdown?.consistency_score,
      result.consistencyScore
    )

    assert.equal(stat.total_tasks_completed, 1)
    assert.equal(stat.total_hours_worked, 6)
    assert.equal(stat.avg_quality_score, 4)
    assert.equal(stat.on_time_delivery_rate, 100)
    assert.equal(stat.performance_score, result.performanceScore)
  })
})
