/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/restrict-template-expressions, @unicorn/no-await-expression-member */
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/close_project_sprint_review_command'
import ProjectSprint from '#modules/reviews/infra/models/project_sprint'
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

function makeContext(userId: string | null, organizationId: string | null) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

async function markSprintReverseReviewWorkflowsDone(sprintId: string) {
  await db
    .from('sprint_reverse_review_workflows')
    .where('sprint_id', sprintId)
    .update({
      status: 'done',
      accepted_at: '2026-07-14T03:00:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })
}

test.group('Integration | Close project sprint review command', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('opens sprint review and creates one package per eligible reviewer', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: org.id })
    const member = await UserFactory.create({ current_organization_id: org.id })
    const assignee = await UserFactory.create({ current_organization_id: org.id })
    const creatorOnly = await UserFactory.create({ current_organization_id: org.id })
    const outside = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: manager.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
    })

    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: creatorOnly.id,
      assigned_to: assignee.id,
      status: 'in_progress',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: manager.id,
      assignment_status: 'active',
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: outside.id,
      assigned_to: outside.id,
    })

    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Close Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })

    const result = await new CloseProjectSprintReviewCommand(
      makeContext(manager.id, org.id)
    ).execute({ sprint_id: sprint.id })

    const packages = await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('reviewer_id')
    const reviewerIds = packages.map((row) => row.reviewer_id).sort()

    assert.equal(result.status, 'review_open')
    assert.equal(result.created_package_count, 3)
    assert.sameMembers(reviewerIds, [assignee.id, creatorOnly.id, manager.id])
    assert.notInclude(reviewerIds, outside.id)

    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)
    assert.equal(reloadedSprint.status, 'review_open')
    assert.equal(reloadedSprint.closed_by, manager.id)
    assert.exists(reloadedSprint.review_opened_at)
  })

  test('rejects non-manager sprint close', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Locked Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(makeContext(member.id, org.id)).execute({
          sprint_id: sprint.id,
        }),
      /Actor cannot manage project sprint/
    )
  })

  test('opens sprint review when one real sprint worker is eligible', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
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
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Single Reviewer Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: worker.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await db.table('task_review_workflows').insert({
      id: testId(),
      task_id: task.id,
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: worker.id,
      status: 'done',
      required_review_count: 2,
      completed_review_count: 2,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    const result = await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })

    assert.sameMembers(result.reviewer_ids, [owner.id, worker.id])
  })

  test('canonical API opens sprint review with wrapped camelCase response', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'API Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })

    const response = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review`)
      .loginAs(owner)
      .json({})

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        sprintId: string
        status: string
        createdPackageCount: number
        reviewerIds: string[]
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.sprintId, sprint.id)
    assert.equal(body.data.status, 'review_open')
    assert.equal(body.data.createdPackageCount, 2)
    assert.sameMembers(body.data.reviewerIds, [owner.id, member.id])
  })

  test('canonical project sprint API creates, lists, shows, updates, and opens review', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })

    const createResponse = await client
      .post(`/api/v1/projects/${project.id}/sprints`)
      .loginAs(owner)
      .json({
        name: 'Canonical Sprint',
        startsAt: '2026-07-01T00:00:00.000Z',
        endsAt: '2026-07-14T00:00:00.000Z',
        status: 'active',
      })
    createResponse.assertStatus(201)

    const created = createResponse.body() as {
      data: {
        id: string
        projectId: string
        organizationId: string
        name: string
        status: string
      }
    }
    assert.equal(created.data.projectId, project.id)
    assert.equal(created.data.organizationId, org.id)
    assert.equal(created.data.name, 'Canonical Sprint')
    assert.equal(created.data.status, 'active')

    const listResponse = await client.get(`/api/v1/projects/${project.id}/sprints`).loginAs(member)
    listResponse.assertStatus(200)
    const listBody = listResponse.body() as { data: Array<{ id: string; status: string }> }
    assert.include(
      listBody.data.map((sprint) => sprint.id),
      created.data.id
    )

    const showResponse = await client
      .get(`/api/v1/projects/${project.id}/sprints/${created.data.id}`)
      .loginAs(member)
    showResponse.assertStatus(200)
    assert.equal(showResponse.body().data.name, 'Canonical Sprint')

    const updateResponse = await client
      .patch(`/api/v1/projects/${project.id}/sprints/${created.data.id}`)
      .loginAs(owner)
      .json({ name: 'Renamed Sprint' })
    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().data.name, 'Renamed Sprint')

    const openReviewResponse = await client
      .post(`/api/v1/projects/${project.id}/sprints/${created.data.id}/open-review`)
      .loginAs(owner)
      .json({})
    openReviewResponse.assertStatus(201)
    assert.equal(openReviewResponse.body().data.sprintId, created.data.id)
    assert.equal(openReviewResponse.body().data.status, 'review_open')
  })

  test('canonical API submits sprint review package with manager and environment reviews', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Submit Sprint Review',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })
    const reviewPackage = await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', member.id)
      .firstOrFail()

    const response = await client
      .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
      .loginAs(member)
      .json({
        managerReviews: [
          {
            targetUserId: owner.id,
            rating: 5,
            dimensions: { clarity: 5 },
            comment: 'Clear ownership and prioritization.',
            isAnonymousToTarget: false,
          },
        ],
        environmentReviews: [
          {
            targetType: 'project',
            targetId: project.id,
            rating: 4,
            dimensions: { process: 4 },
            comment: 'Project rituals worked.',
            isAnonymousPublicly: true,
          },
          {
            targetType: 'organization',
            targetId: org.id,
            rating: 4,
            dimensions: { support: 4 },
            comment: 'Org support was enough.',
            isAnonymousPublicly: false,
          },
        ],
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        packageId: string
        status: string
        managerReviewsCount: number
        environmentReviewsCount: number
      }
    }
    const managerReviews = await db
      .from('sprint_manager_reviews')
      .where('package_id', reviewPackage.id)
    const environmentReviews = await db
      .from('sprint_environment_reviews')
      .where('package_id', reviewPackage.id)

    assert.equal(body.data.packageId, reviewPackage.id)
    assert.equal(body.data.status, 'submitted')
    assert.equal(body.data.managerReviewsCount, 1)
    assert.equal(body.data.environmentReviewsCount, 2)
    assert.equal(managerReviews.length, 1)
    assert.equal(environmentReviews.length, 2)
    assert.isFalse(managerReviews[0].is_anonymous_to_target)
  })

  test('canonical API rejects duplicate sprint review package submit without duplicating reviews', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Duplicate Submit Sprint Review',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })
    const reviewPackage = await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', member.id)
      .firstOrFail()
    const payload = {
      managerReviews: [
        {
          targetUserId: owner.id,
          rating: 5,
          dimensions: { clarity: 5 },
          comment: 'Clear ownership and prioritization.',
          isAnonymousToTarget: false,
        },
      ],
      environmentReviews: [
        {
          targetType: 'project',
          targetId: project.id,
          rating: 4,
          dimensions: { process: 4 },
          comment: 'Project rituals worked.',
          isAnonymousPublicly: true,
        },
        {
          targetType: 'organization',
          targetId: org.id,
          rating: 4,
          dimensions: { support: 4 },
          comment: 'Org support was enough.',
          isAnonymousPublicly: false,
        },
      ],
    }

    const firstResponse = await client
      .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
      .loginAs(member)
      .json(payload)
    firstResponse.assertStatus(201)

    const beforeDuplicatePackage = await db
      .from('sprint_review_packages')
      .where('id', reviewPackage.id)
      .select('status', 'submitted_at')
      .firstOrFail()

    const duplicateResponse = await client
      .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
      .loginAs(member)
      .json(payload)

    duplicateResponse.assertStatus(400)
    assert.notInclude(duplicateResponse.text(), 'E_INTERNAL_ERROR')

    const afterDuplicatePackage = await db
      .from('sprint_review_packages')
      .where('id', reviewPackage.id)
      .select('status', 'submitted_at')
      .firstOrFail()
    const managerReviews = await db
      .from('sprint_manager_reviews')
      .where('package_id', reviewPackage.id)
    const environmentReviews = await db
      .from('sprint_environment_reviews')
      .where('package_id', reviewPackage.id)

    assert.deepEqual(afterDuplicatePackage, beforeDuplicatePackage)
    assert.equal(managerReviews.length, 1)
    assert.equal(environmentReviews.length, 2)
  })

  test('canonical API closes sprint review period only after all packages are submitted', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Close Review Period',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })

    const blocked = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})

    blocked.assertStatus(400)
    assert.include(JSON.stringify(blocked.body()), 'unfinished reverse review workflows')

    await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .update({ status: 'submitted', submitted_at: '2026-07-14T02:00:00.000Z' })
    await markSprintReverseReviewWorkflowsDone(sprint.id)

    const response = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        sprintId: string
        status: string
        closedPackageCount: number
      }
    }
    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)

    assert.equal(body.data.sprintId, sprint.id)
    assert.equal(body.data.status, 'review_closed')
    assert.equal(body.data.closedPackageCount, 2)
    assert.equal(reloadedSprint.status, 'review_closed')
    assert.exists(reloadedSprint.review_closed_at)
  })

  test('closing sprint review period refreshes manager and organization review stats', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Stats Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })
    await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })
    const packages = await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('id', 'reviewer_id')

    for (const reviewPackage of packages) {
      const isMember = reviewPackage.reviewer_id === member.id
      const submitResponse = await client
        .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
        .loginAs(isMember ? member : owner)
        .json({
          managerReviews: isMember
            ? [
                {
                  targetUserId: owner.id,
                  rating: 5,
                  comment: 'Strong direction.',
                },
              ]
            : [],
          environmentReviews: [
            {
              targetType: 'project',
              targetId: project.id,
              rating: isMember ? 4 : 3,
            },
            {
              targetType: 'organization',
              targetId: org.id,
              rating: isMember ? 5 : 3,
              isAnonymousPublicly: isMember,
            },
          ],
      })
      submitResponse.assertStatus(201)
    }
    await markSprintReverseReviewWorkflowsDone(sprint.id)

    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(201)

    const managerStats = await db
      .from('reverse_review_target_stats')
      .where('target_type', 'manager')
      .where('target_id', owner.id)
      .firstOrFail()
    const organizationStats = await db
      .from('reverse_review_target_stats')
      .where('target_type', 'organization')
      .where('target_id', org.id)
      .firstOrFail()

    assert.equal(Number(managerStats.total_reviews), 1)
    assert.equal(Number(managerStats.average_rating), 5)
    assert.equal(Number(organizationStats.total_reviews), 2)
    assert.equal(Number(organizationStats.average_rating), 4)
    assert.equal(Number(organizationStats.anonymous_reviews), 1)
  })

  test('sprint review actions write audit logs', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
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
      user_id: member.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Audit Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: member.id,
      status: 'done',
    })

    const openResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review`)
      .loginAs(owner)
      .json({})
    openResponse.assertStatus(201)

    const packages = await db.from('sprint_review_packages').where('sprint_id', sprint.id)
    const openNotifications = await db
      .from('notifications')
      .where('related_entity_type', 'project_sprint')
      .where('related_entity_id', sprint.id)
      .select('user_id', 'type')
    assert.sameMembers(
      openNotifications.map((notification) => notification.user_id),
      [owner.id, member.id]
