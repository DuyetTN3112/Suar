import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ReverseReviewFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

async function buildScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create()
  const orgAdmin = await UserFactory.create({ current_organization_id: org.id })
  const systemAdmin = await UserFactory.create({ system_role: 'system_admin' })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: orgAdmin.id,
    org_role: 'org_admin',
    status: 'approved',
  })

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

  const other = await OrganizationFactory.createWithOwner()
  const otherProject = await ProjectFactory.create({
    organization_id: other.org.id,
    creator_id: other.owner.id,
    owner_id: other.owner.id,
  })
  const otherTask = await TaskFactory.create({
    organization_id: other.org.id,
    creator_id: other.owner.id,
    project_id: otherProject.id,
  })
  const otherAssignment = await TaskAssignmentFactory.create({
    task_id: otherTask.id,
    assignee_id: other.owner.id,
    assigned_by: other.owner.id,
    assignment_status: 'completed',
  })
  const otherSession = await ReviewSessionFactory.create({
    task_assignment_id: otherAssignment.id,
    reviewee_id: other.owner.id,
    status: 'completed',
  })

  const authoredAnonymous = await ReverseReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: reviewee.id,
    target_type: 'peer',
    target_id: owner.id,
    is_anonymous: true,
    comment: 'Private feedback',
  })
  await ReverseReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: reviewee.id,
    target_type: 'project',
    target_id: project.id,
    is_anonymous: false,
    comment: 'Project process feedback',
  })
  const foreignReview = await ReverseReviewFactory.create({
    review_session_id: otherSession.id,
    reviewer_id: other.owner.id,
    target_type: 'organization',
    target_id: other.org.id,
    is_anonymous: true,
    comment: 'Foreign org feedback',
  })

  return { org, owner, reviewee, orgAdmin, systemAdmin, authoredAnonymous, foreignReview }
}

test.group('Integration | Reverse Review Reads', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('reviewee lists authored reverse reviews with full private details', async ({ assert }) => {
    const scenario = await buildScenario()

    const result = await new ListReverseReviewsQuery({
      userId: scenario.reviewee.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({ scope: 'me', page: 1, perPage: 20 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.data[0]?.reviewer_id, scenario.reviewee.id)
    assert.equal(result.stats.total, 2)
    assert.exists(result.data.find((item) => item.id === scenario.authoredAnonymous.id && item.reviewer_id === scenario.reviewee.id))
  })

  test('organization scope hides anonymous reviewer identity and excludes foreign org rows', async ({
    assert,
  }) => {
    const scenario = await buildScenario()

    const result = await new ListReverseReviewsQuery({
      userId: scenario.orgAdmin.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({ scope: 'org', page: 1, perPage: 20 })

    assert.lengthOf(result.data, 2)
    assert.equal(result.stats.anonymous, 1)
    assert.notExists(result.data.find((item) => item.id === scenario.foreignReview.id))
    assert.exists(result.data.find((item) => item.id === scenario.authoredAnonymous.id && item.reviewer_id === null))
  })

  test('admin scope can inspect anonymous identity while non-admin is denied', async ({ assert }) => {
    const scenario = await buildScenario()

    const adminResult = await new ListReverseReviewsQuery({
      userId: scenario.systemAdmin.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({ scope: 'admin', page: 1, perPage: 20 })

    assert.exists(
      adminResult.data.find(
        (item) => item.id === scenario.authoredAnonymous.id && item.reviewer_id === scenario.reviewee.id
      )
    )

    await assert.rejects(
      () =>
        new ListReverseReviewsQuery({
          userId: scenario.reviewee.id,
          ip: '0.0.0.0',
          userAgent: 'test',
          organizationId: null,
        }).execute({ scope: 'admin', page: 1, perPage: 20 }),
      ForbiddenException
    )
  })

  test('me scope supports bidirectional cursor pagination without overlapping windows', async ({
    assert,
  }) => {
    const scenario = await buildScenario()
    const baseTime = DateTime.fromISO('2099-07-05T14:00:00.000Z')
    const reviewIds: string[] = []

    for (let index = 0; index < 4; index++) {
      const review = await ReverseReviewFactory.create({
        review_session_id: scenario.authoredAnonymous.review_session_id,
        reviewer_id: scenario.reviewee.id,
        target_type: 'peer',
        target_id: scenario.owner.id,
        rating: 5 - index,
        comment: `Cursor reverse review ${index}`,
        is_anonymous: index % 2 === 0,
      })
      review.created_at = baseTime.minus({ minutes: index })
      await review.save()
      reviewIds.push(review.id)
    }

    const query = new ListReverseReviewsQuery({
      userId: scenario.reviewee.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    })

    const firstWindow = await query.execute({ scope: 'me', page: 1, perPage: 2 })

    assert.deepEqual(
      firstWindow.data.map((item) => item.id),
      reviewIds.slice(0, 2)
    )
    assert.isTrue(firstWindow.meta.cursor?.has_next_page ?? false)
    assert.isFalse(firstWindow.meta.cursor?.has_previous_page ?? true)

    const nextCursor = firstWindow.meta.cursor?.next_cursor
    const secondWindow = await query.execute({
      scope: 'me',
      page: 1,
      perPage: 2,
      ...(nextCursor !== null && nextCursor !== undefined ? { after: nextCursor } : {}),
    })

    assert.deepEqual(
      secondWindow.data.map((item) => item.id),
      reviewIds.slice(2, 4)
    )
    assert.isTrue(secondWindow.meta.cursor?.has_previous_page ?? false)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const previousCursor = secondWindow.meta.cursor?.previous_cursor
    const newerWindow = await query.execute({
      scope: 'me',
      page: 1,
      perPage: 2,
      ...(previousCursor !== null && previousCursor !== undefined ? { before: previousCursor } : {}),
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      reviewIds.slice(0, 2)
    )
    assert.isFalse(newerWindow.meta.cursor?.has_previous_page ?? true)
    assert.isTrue(newerWindow.meta.cursor?.has_next_page ?? false)
  })
})
