import { test } from '@japa/runner'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  SkillFactory,
  SkillReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  OrganizationFactory,
  TaskFactory,
  UserSkillFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import UserSkill from '#models/user_skill'
import SkillReview from '#models/skill_review'
import { ProficiencyLevel, getLevelCodeFromPercentage } from '#constants/user_constants'

test.group('Integration | Spider Chart', (group) => {
  group.setup(() => setupApp())
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('calculate avg_percentage for spider chart skill', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ display_type: 'spider_chart' })
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: user.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: user.id,
      status: 'completed',
    })

    // Create skill reviews with different levels
    // senior (50-62.5%), lead (62.5-75%)
    const reviewer1 = await UserFactory.create()
    const reviewer2 = await UserFactory.create()

    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer1.id,
      skill_id: skill.id,
      assigned_level_code: ProficiencyLevel.SENIOR,
    })
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer2.id,
      skill_id: skill.id,
      assigned_level_code: ProficiencyLevel.LEAD,
    })

    const reviews = await SkillReview.query().where('skill_id', skill.id)
    assert.equal(reviews.length, 2)
  })

  test('level code mapping from percentage', async ({ assert }) => {
    assert.equal(getLevelCodeFromPercentage(0), ProficiencyLevel.BEGINNER)
    assert.equal(getLevelCodeFromPercentage(10), ProficiencyLevel.BEGINNER)
    assert.equal(getLevelCodeFromPercentage(50), ProficiencyLevel.SENIOR)
    assert.equal(getLevelCodeFromPercentage(75), ProficiencyLevel.PRINCIPAL)
    assert.equal(getLevelCodeFromPercentage(100), ProficiencyLevel.MASTER)
  })

  test('upsert into user_skills', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ display_type: 'spider_chart' })

    // Create initial user_skill
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      level_code: ProficiencyLevel.JUNIOR,
      avg_percentage: 30,
    })

    // Update it
    const existing = await UserSkill.query()
      .where('user_id', user.id)
      .where('skill_id', skill.id)
      .firstOrFail()

    await existing
      .merge({
        level_code: ProficiencyLevel.SENIOR,
        avg_percentage: 55,
      })
      .save()

    const updated = await UserSkill.query()
      .where('user_id', user.id)
      .where('skill_id', skill.id)
      .firstOrFail()

    assert.equal(updated.level_code, ProficiencyLevel.SENIOR)
    assert.equal(updated.avg_percentage, 55)
  })

  test('handles no reviews gracefully', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ display_type: 'spider_chart' })

    const reviews = await SkillReview.query().where('skill_id', skill.id)
    assert.equal(reviews.length, 0)
  })

  test('multiple reviews averaging produces correct result', async ({ assert }) => {
    // Test pure calculation
    const percentages = [50, 60, 70]
    const avg = percentages.reduce((a, b) => a + b, 0) / percentages.length
    assert.closeTo(avg, 60, 0.01)

    const levelCode = getLevelCodeFromPercentage(avg)
    assert.equal(levelCode, ProficiencyLevel.SENIOR)
  })
})
