import { test } from '@japa/runner'

import { userProfileRepository } from '#composition/users/user-persistence/user_persistence_composition'
import { makeGetFeaturedReviewsQuery } from '#composition/users/user-reading/user_query_composition'
import { cacheStore } from '#modules/cache/public_contracts/cache_store'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import GetFeaturedReviewsQuery, {
  GetFeaturedReviewsDTO,
} from '#modules/users/actions/queries/profile/get_featured_reviews_query'
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

const LEAKED_REVIEWER_NAME = 'private_reviewer_identity'
const LEAKED_REVIEW_COMMENT = 'Private testimonial that has no publication consent'
const LEAKED_TASK_TITLE = 'Confidential acquisition task'

function makeQuery(userId: string): GetFeaturedReviewsQuery {
  return makeGetFeaturedReviewsQuery({
    userId,
    organizationId: null,
    ip: '0.0.0.0',
    userAgent: 'test',
    requestId: null,
    traceId: null,
    workflowId: null,
  })
}

test.group('Integration | Featured review privacy', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns generated skill evidence without reviewer identity, comment, or task title', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create({ current_organization_id: org.id })
    const reviewer = await UserFactory.create({ username: LEAKED_REVIEWER_NAME })
    const skill = await SkillFactory.create({ skill_name: 'System Design' })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: LEAKED_TASK_TITLE,
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
    })

    await UserSkillFactory.create({
      user_id: reviewee.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l8',
      total_reviews: 3,
      avg_score: 88,
      avg_percentage: 88,
    })
    await SkillReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewer.id,
      reviewer_type: 'manager',
      skill_id: skill.id,
      assigned_public_proficiency_code: 'l8',
      comment: LEAKED_REVIEW_COMMENT,
    })

    const legacyCacheKey = `users:featured_reviews:${reviewee.id}:2`
    await cacheStore.set(
      legacyCacheKey,
      [
        {
          reviewer_name: LEAKED_REVIEWER_NAME,
          content: LEAKED_REVIEW_COMMENT,
          task_name: LEAKED_TASK_TITLE,
        },
      ],
      300
    )

    const result = await makeQuery(owner.id).handle(new GetFeaturedReviewsDTO(reviewee.id, 2))
    const item = result[0]
    const serializedResult = JSON.stringify(result)

    assert.lengthOf(result, 1)
    assert.isDefined(item)
    assert.equal(item?.reviewer_name, 'Tổng hợp đánh giá')
    assert.equal(item?.reviewer_role, '3 lượt đánh giá')
    assert.equal(item?.stars, 4)
    assert.equal(item?.task_name, 'Skill: System Design')
    assert.include(item?.content ?? '', 'System Design')
    assert.notInclude(serializedResult, LEAKED_REVIEWER_NAME)
    assert.notInclude(serializedResult, LEAKED_REVIEW_COMMENT)
    assert.notInclude(serializedResult, LEAKED_TASK_TITLE)
  })

  test('keeps the featured review response shape with neutral generated values', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ skill_name: 'TypeScript', is_active: false })
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l7',
      total_reviews: 2,
      avg_score: 74,
      avg_percentage: 74,
    })

    const [item] = await makeQuery(user.id).handle(new GetFeaturedReviewsDTO(user.id, 1))

    assert.properties(item, [
      'skill_id',
      'skill_name',
      'verified_public_proficiency_code',
      'avg_percentage',
      'total_reviews',
      'reviewer_name',
      'reviewer_role',
      'stars',
      'content',
      'task_name',
    ])
    assert.equal(item?.skill_name, 'TypeScript')
  })

  test('preserves Users-owned ranking and limit after bulk Skills enrichment', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const highestReviewedSkill = await SkillFactory.create({ skill_name: 'Highest reviewed' })
    const highestPercentageSkill = await SkillFactory.create({ skill_name: 'Highest percentage' })
    const excludedByLimitSkill = await SkillFactory.create({ skill_name: 'Excluded by limit' })

    await Promise.all([
      UserSkillFactory.create({
        user_id: user.id,
        skill_id: highestReviewedSkill.id,
        verified_public_proficiency_code: 'l7',
        total_reviews: 5,
        avg_score: 70,
        avg_percentage: 70,
      }),
      UserSkillFactory.create({
        user_id: user.id,
        skill_id: highestPercentageSkill.id,
        verified_public_proficiency_code: 'l8',
        total_reviews: 3,
        avg_score: 90,
        avg_percentage: 90,
      }),
      UserSkillFactory.create({
        user_id: user.id,
        skill_id: excludedByLimitSkill.id,
        verified_public_proficiency_code: 'l6',
        total_reviews: 2,
        avg_score: 99,
        avg_percentage: 99,
      }),
    ])

    const result = await makeQuery(user.id).handle(new GetFeaturedReviewsDTO(user.id, 2))

    assert.deepEqual(
      result.map((item) => item.skill_id),
      [highestReviewedSkill.id, highestPercentageSkill.id]
    )
  })

  test('fails fast when a persisted user skill has no matching Skills fact', async ({ assert }) => {
    const user = await UserFactory.create()
    const skill = await SkillFactory.create({ skill_name: 'Missing projection source' })
    await UserSkillFactory.create({
      user_id: user.id,
      skill_id: skill.id,
      verified_public_proficiency_code: 'l7',
      total_reviews: 2,
      avg_score: 74,
      avg_percentage: 74,
    })

    let bulkCalls = 0
    let requestedSkillIds: string[] = []
    const query = new GetFeaturedReviewsQuery(
      {
        userId: user.id,
        organizationId: null,
        ip: '0.0.0.0',
        userAgent: 'test',
        requestId: null,
        traceId: null,
        workflowId: null,
      },
      {
        findSkillSummariesByIds(skillIds) {
          bulkCalls += 1
          requestedSkillIds = skillIds
          return Promise.resolve([])
        },
      },
      userProfileRepository
    )

    let thrown: unknown
    try {
      await query.handle(new GetFeaturedReviewsDTO(user.id, 1))
    } catch (error) {
      thrown = error
    }

    assert.equal(bulkCalls, 1)
    assert.deepEqual(requestedSkillIds, [skill.id])
    assert.instanceOf(thrown, InvariantViolationException)
    assert.include((thrown as Error).message, skill.id)
  })
})
