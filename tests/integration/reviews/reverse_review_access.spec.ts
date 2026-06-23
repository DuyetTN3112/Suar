import { test } from '@japa/runner'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import ListReverseReviewsQuery from '#modules/reviews/actions/queries/list_reverse_reviews_query'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
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

function makeReviewActionContext(userId: string, organizationId: string | null): ReviewActionContext {
  return {
    ...makeSystemReviewActionContext(userId),
    organizationId,
  }
}

test.group('Integration | Reverse Review Access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('org scope requires org owner role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
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
    const reviewee = await UserFactory.create()
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
      is_anonymous: false,
    })

    const ctx = makeReviewActionContext(owner.id, org.id)
    const query = new ListReverseReviewsQuery(ctx)
    const result = await query.execute({ scope: 'org' })

    assert.isArray(result)
    assert.isTrue(result.length > 0)
  })

  test('org scope requires org admin role', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
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
    const reviewee = await UserFactory.create()
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
      is_anonymous: false,
    })

    const ctx = makeReviewActionContext(admin.id, org.id)
    const query = new ListReverseReviewsQuery(ctx)
    const result = await query.execute({ scope: 'org' })

    assert.isArray(result)
    assert.isTrue(result.length > 0)
  })

  test('org scope rejects plain org member without elevated role', async ({ assert }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const ctx = makeReviewActionContext(member.id, org.id)
    const query = new ListReverseReviewsQuery(ctx)

    await assert.rejects(
      () => query.execute({ scope: 'org' }),
      ForbiddenException
    )
  })

  test('org scope rejects user without org context', async ({ assert }) => {
    const user = await UserFactory.create()
    const ctx = makeSystemReviewActionContext(user.id)

    const query = new ListReverseReviewsQuery(ctx)

    await assert.rejects(
      () => query.execute({ scope: 'org' }),
      ForbiddenException
    )
  })

  test('me scope returns only own reverse reviews', async ({ assert }) => {
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
      is_anonymous: false,
    })

    const ctx = makeSystemReviewActionContext(reviewee.id)
    const query = new ListReverseReviewsQuery(ctx)
    const result = await query.execute({ scope: 'me' })

    assert.isArray(result)
    assert.isTrue(result.length > 0)
    assert.isTrue(result.every((r) => r.reviewer_id === reviewee.id))
  })

  test('admin scope requires system_admin role', async ({ assert }) => {
    const admin = await UserFactory.create({ system_role: 'system_admin' })
    const ctx = makeSystemReviewActionContext(admin.id)

    const query = new ListReverseReviewsQuery(ctx)
    const result = await query.execute({ scope: 'admin' })

    assert.isArray(result)
  })

  test('admin scope rejects non-admin user', async ({ assert }) => {
    const user = await UserFactory.create({ system_role: 'registered_user' })
    const ctx = makeSystemReviewActionContext(user.id)

    const query = new ListReverseReviewsQuery(ctx)

    await assert.rejects(
      () => query.execute({ scope: 'admin' }),
      ForbiddenException
    )
  })

  test('unauthenticated user is rejected for all scopes', async ({ assert }) => {
    const ctx = { userId: null, ip: '0.0.0.0', userAgent: 'system', organizationId: null }
    const query = new ListReverseReviewsQuery(ctx)

    await assert.rejects(
      () => query.execute({ scope: 'me' }),
      UnauthorizedException
    )
  })
})
