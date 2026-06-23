import { test } from '@japa/runner'

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
    }).execute({ scope: 'me' })

    assert.lengthOf(result, 2)
    assert.equal(result[0]?.reviewer_id, scenario.reviewee.id)
    assert.exists(result.find((item) => item.id === scenario.authoredAnonymous.id && item.reviewer_id === scenario.reviewee.id))
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
    }).execute({ scope: 'org' })

    assert.lengthOf(result, 2)
    assert.notExists(result.find((item) => item.id === scenario.foreignReview.id))
    assert.exists(result.find((item) => item.id === scenario.authoredAnonymous.id && item.reviewer_id === null))
  })

  test('admin scope can inspect anonymous identity while non-admin is denied', async ({ assert }) => {
    const scenario = await buildScenario()

    const adminResult = await new ListReverseReviewsQuery({
      userId: scenario.systemAdmin.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({ scope: 'admin' })

    assert.exists(
      adminResult.find(
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
        }).execute({ scope: 'admin' }),
      ForbiddenException
    )
  })
})
