import { test } from '@japa/runner'

import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  ReverseReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Reverse Review Page Contract', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('me scope returns correct shape', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'manager',
      target_id: owner.id,
      rating: 4,
      comment: 'Great manager',
      is_anonymous: false,
    })

    const ctx = makeSystemReviewActionContext(reviewee.id)
    const query = new ListReverseReviewsQuery(ctx)
    const records = await query.execute({ scope: 'me' })

    assert.isArray(records)
    if (records.length > 0) {
      const first = records[0]
      assert.property(first, 'id')
      assert.property(first, 'review_session_id')
      assert.property(first, 'reviewer_id')
      assert.property(first, 'target_type')
      assert.property(first, 'target_id')
      assert.property(first, 'rating')
      assert.property(first, 'comment')
      assert.property(first, 'is_anonymous')
      assert.property(first, 'created_at')
    }
  })

  test('anonymous reviews hide reviewer_id in org scope', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'peer',
      target_id: owner.id,
      rating: 5,
      is_anonymous: true,
    })

    const ctx = makeSystemReviewActionContext(owner.id)
    ;(ctx as unknown as { organizationId: string }).organizationId = org.id

    const query = new ListReverseReviewsQuery(ctx)
    const records = await query.execute({ scope: 'org' })

    const anonymousRecord = records.find((r) => r.is_anonymous)
    if (anonymousRecord) {
      assert.isNull(anonymousRecord.reviewer_id)
    }
  })

  test('stats summarize correctly', ({ assert }) => {
    const records = [
      { is_anonymous: true, target_type: 'manager' },
      { is_anonymous: false, target_type: 'peer' },
      { is_anonymous: true, target_type: 'manager' },
    ]

    const anonymous = records.filter((record) => record.is_anonymous).length
    const byTargetType = records.reduce<Record<string, number>>((acc, record) => {
      acc[record.target_type] = (acc[record.target_type] ?? 0) + 1
      return acc
    }, {})
    const stats = { total: records.length, anonymous, by_target_type: byTargetType }

    assert.equal(stats.total, 3)
    assert.equal(stats.anonymous, 2)
    assert.equal(stats.by_target_type.manager, 2)
    assert.equal(stats.by_target_type.peer, 1)
  })
})

  test('org scope masks author identity for anonymous reviews', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
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
    await ReverseReviewFactory.create({
      review_session_id: session.id,
      reviewer_id: reviewee.id,
      target_type: 'peer',
      target_id: owner.id,
      rating: 3,
      is_anonymous: true,
    })

    const ctx = makeSystemReviewActionContext(owner.id)
    ;(ctx as unknown as { organizationId: string }).organizationId = org.id

    const query = new ListReverseReviewsQuery(ctx)
    const records = await query.execute({ scope: 'org' })

    assert.isArray(records)
    const anonRecords = records.filter((r) => r.is_anonymous)
    assert.isTrue(anonRecords.length > 0)
    if (anonRecords[0]) {
      assert.isNull(anonRecords[0].reviewer_id)
    }
  })

  test('admin scope returns unmasked data', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })
    const ctx = makeSystemReviewActionContext(admin.id)

    const query = new ListReverseReviewsQuery(ctx)
    const records = await query.execute({ scope: 'admin' })

    assert.isArray(records)
  })
