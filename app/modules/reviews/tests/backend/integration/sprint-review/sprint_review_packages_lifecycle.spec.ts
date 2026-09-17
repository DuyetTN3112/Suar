import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  requireTestValue,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
} from '../support/sprint_review_packages_test_support.js'

import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import ProjectSprint from '#modules/reviews/infra/models/sprint-review/project_sprint'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Sprint review packages API - Lifecycle & Views', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists current user pending sprint review packages', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const otherReviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherReviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: otherReviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Pending Review Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const reviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    const otherReviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: otherReviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: reviewerTask.id,
      assignee_id: reviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: otherReviewerTask.id,
      assignee_id: otherReviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await new CloseProjectSprintReviewCommand(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })

    const otherPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', otherReviewer.id)
      .firstOrFail()) as { id: string }
    await db
      .from('sprint_review_packages')
      .where('id', otherPackage.id)
      .update({ status: 'submitted', submitted_at: '2026-07-14T02:00:00.000Z' })

    const response = await client.get('/api/v1/me/sprint-review-packages/pending').loginAs(reviewer)

    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        sprintId: string
        reviewerId: string
        status: string
        sprintName: string
        projectId: string
        projectName: string
        organizationId: string
      }>
    }

    assert.lengthOf(body.data, 1)
    const row = requireTestValue(body.data[0], 'pending review package')
    assert.equal(row.sprintId, sprint.id)
    assert.equal(row.reviewerId, reviewer.id)
    assert.equal(row.status, 'pending')
    assert.equal(row.sprintName, 'Pending Review Sprint')
    assert.equal(row.projectId, project.id)
    assert.equal(row.projectName, project.name)
    assert.equal(row.organizationId, org.id)
  })

  test('shows sprint review package form context with eligible manager targets', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Package Detail Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const reviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: reviewerTask.id,
      assignee_id: reviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await new CloseProjectSprintReviewCommand(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })
    const reviewPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', reviewer.id)
      .firstOrFail()) as { id: string }

    const response = await client
      .get(`/api/v1/sprint-review-packages/${reviewPackage.id}`)
      .loginAs(reviewer)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        sprintId: string
        reviewerId: string
        status: string
        projectTarget: { id: string; name: string }
        organizationTarget: { id: string; name: string }
        eligibleManagerTargets: Array<{ userId: string; targetRole: string }>
      }
    }

    assert.equal(body.data.id, reviewPackage.id)
    assert.equal(body.data.sprintId, sprint.id)
    assert.equal(body.data.reviewerId, reviewer.id)
    assert.equal(body.data.status, 'pending')
    assert.equal(body.data.projectTarget.id, project.id)
    assert.equal(body.data.projectTarget.name, project.name)
    assert.equal(body.data.organizationTarget.id, org.id)
    assert.equal(body.data.organizationTarget.name, org.name)
    const ownerTarget = body.data.eligibleManagerTargets.find(
      (target) => target.userId === owner.id
    )
    assert.equal(requireTestValue(ownerTarget, 'owner target').targetRole, 'owner')
  })

  test('lists submitted sprint review packages and shows read-only submitted reviews', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Submitted Package Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'submitted',
      submitted_at: '2026-07-14T02:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_manager_reviews').insert({
      id: testId(),
      package_id: packageId,
      target_user_id: owner.id,
      target_role: 'owner',
      rating: 5,
      dimensions: JSON.stringify({ clarity: 5 }),
      comment: 'Clear sprint direction.',
      is_anonymous_to_target: true,
      created_at: '2026-07-14T02:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_environment_reviews').insert([
      {
        id: testId(),
        package_id: packageId,
        target_type: 'project',
        target_id: project.id,
        rating: 4,
        dimensions: JSON.stringify({ process: 4 }),
        comment: 'Project flow was stable.',
        is_anonymous_publicly: true,
        created_at: '2026-07-14T02:00:00.000Z',
        updated_at: '2026-07-14T02:00:00.000Z',
      },
      {
        id: testId(),
        package_id: packageId,
        target_type: 'organization',
        target_id: org.id,
        rating: 3,
        dimensions: JSON.stringify({ support: 3 }),
        comment: 'Org support was acceptable.',
        is_anonymous_publicly: false,
        created_at: '2026-07-14T02:00:00.000Z',
        updated_at: '2026-07-14T02:00:00.000Z',
      },
    ])

    const listResponse = await client.get('/api/v1/me/sprint-review-packages').loginAs(reviewer)

    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{ id: string; status: string; sprintName: string; submittedAt: string | null }>
    }
    assert.equal(listBody.data[0]?.id, packageId)
    assert.equal(listBody.data[0]?.status, 'submitted')
    assert.equal(listBody.data[0]?.sprintName, 'Submitted Package Sprint')
    assert.equal(listBody.data[0]?.submittedAt, '2026-07-14T02:00:00.000Z')

    const detailResponse = await client
      .get(`/api/v1/sprint-review-packages/${packageId}`)
      .loginAs(reviewer)

    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        status: string
        managerReviews: Array<{
          targetUserId: string
          targetRole: string
          rating: number
          comment: string
        }>
        environmentReviews: Array<{ targetType: string; rating: number; comment: string }>
      }
    }

    assert.equal(detailBody.data.status, 'submitted')
    assert.lengthOf(detailBody.data.managerReviews, 1)
    const managerReview = requireTestValue(
      detailBody.data.managerReviews[0],
      'manager review'
    )
    assert.equal(managerReview.targetUserId, owner.id)
    assert.equal(managerReview.targetRole, 'owner')
    assert.equal(managerReview.rating, 5)
    assert.equal(managerReview.comment, 'Clear sprint direction.')
    assert.lengthOf(detailBody.data.environmentReviews, 2)
    assert.sameMembers(
      detailBody.data.environmentReviews.map((review) => review.targetType),
      ['project', 'organization']
    )
  })
})
