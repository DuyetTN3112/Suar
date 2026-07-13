import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { listAuditLogsByEntity } from '#composition/admin/audit/audit_read_composition'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
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

function makeContext(userId: string | null, organizationId: string | null) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

const reviewCryptography = new NodeReviewCryptography()
const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()

interface SprintReviewPackageRow {
  id: string
  reviewer_id: string
  status?: string
  submitted_at?: unknown
}

interface ReverseReviewTargetStatsRow {
  total_reviews: number | string
  average_rating: number | string
  anonymous_reviews: number | string
}

async function markSprintReverseReviewWorkflowsDone(sprintId: string) {
  await db.from('sprint_reverse_review_workflows').where('sprint_id', sprintId).update({
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
      makeContext(manager.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('reviewer_id')) as Array<Pick<SprintReviewPackageRow, 'reviewer_id'>>
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

  test('rolls sprint, packages, next sprint, and audit back when fanout fails', async ({
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
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: worker.id,
      project_role: 'project_member',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Atomic review sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprint.id })
    const failingFanout: NotificationFanoutStagerContract = {
      stage: () => Promise.reject(new Error('simulated sprint fanout failure')),
    }

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(
          makeContext(owner.id, org.id),
          reviewCryptography,
          new LucidReviewSprintPackageMutationUnitOfWork(failingFanout)
        ).execute({ sprint_id: sprint.id }),
      /simulated sprint fanout failure/
    )

    const reloadedSprint = await ProjectSprint.findOrFail(sprint.id)
    assert.equal(reloadedSprint.status, 'active')
    assert.lengthOf(await db.from('sprint_review_packages').where('sprint_id', sprint.id), 0)
    assert.equal(
      Number(
        (
          (await db
            .from('project_sprints')
            .where('project_id', project.id)
            .count('* as count')
            .first()) as { count: number | string }
        ).count
      ),
      1
    )
    assert.lengthOf(
      await db
        .from('audit_events')
        .where('entity_type', 'project_sprint')
        .where('entity_id', sprint.id)
        .where('action', 'open_sprint_review'),
      0
    )
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
        new CloseProjectSprintReviewCommand(
          makeContext(member.id, org.id),
          reviewCryptography,
          sprintPackageMutationUnitOfWork
        ).execute({
          sprint_id: sprint.id,
        }),
      /Actor cannot manage project sprint/
    )
  })

  test('opens sprint review when one real sprint worker is eligible', async ({ assert }) => {
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

    const result = await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
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
        status: 'draft',
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
    assert.equal(created.data.status, 'draft')

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
    const showBody = showResponse.body() as { data: { name: string } }
    assert.equal(showBody.data.name, 'Canonical Sprint')

    const updateResponse = await client
      .patch(`/api/v1/projects/${project.id}/sprints/${created.data.id}`)
      .loginAs(owner)
      .json({ name: 'Renamed Sprint' })
    updateResponse.assertStatus(200)
    const updateBody = updateResponse.body() as { data: { name: string } }
    assert.equal(updateBody.data.name, 'Renamed Sprint')

    const startResponse = await client
      .post(`/api/v1/projects/${project.id}/sprints/${created.data.id}/start`)
      .loginAs(owner)
      .json({})
    startResponse.assertStatus(200)
    const startBody = startResponse.body() as { data: { status: string } }
    assert.equal(startBody.data.status, 'active')

    const openReviewResponse = await client
      .post(`/api/v1/projects/${project.id}/sprints/${created.data.id}/open-review`)
      .loginAs(owner)
      .json({})
    openReviewResponse.assertStatus(201)
    const openReviewBody = openReviewResponse.body() as {
      data: { sprintId: string; status: string }
    }
    assert.equal(openReviewBody.data.sprintId, created.data.id)
    assert.equal(openReviewBody.data.status, 'review_open')
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
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })
    const reviewPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', member.id)
      .firstOrFail()) as SprintReviewPackageRow

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
    const managerReviews = (await db
      .from('sprint_manager_reviews')
      .where('package_id', reviewPackage.id)) as Array<{
      is_anonymous_to_target: boolean
    }>
    const environmentReviews = (await db
      .from('sprint_environment_reviews')
      .where('package_id', reviewPackage.id)) as Array<Record<string, unknown>>

    assert.equal(body.data.packageId, reviewPackage.id)
    assert.equal(body.data.status, 'submitted')
    assert.equal(body.data.managerReviewsCount, 1)
    assert.equal(body.data.environmentReviewsCount, 2)
    assert.equal(managerReviews.length, 1)
    assert.equal(environmentReviews.length, 2)
    assert.deepEqual(
      managerReviews.map((review) => review.is_anonymous_to_target),
      [false]
    )
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
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })
    const reviewPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', member.id)
      .firstOrFail()) as SprintReviewPackageRow
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

    const beforeDuplicatePackage = (await db
      .from('sprint_review_packages')
      .where('id', reviewPackage.id)
      .select('status', 'submitted_at')
      .firstOrFail()) as Pick<SprintReviewPackageRow, 'status' | 'submitted_at'>

    const duplicateResponse = await client
      .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
      .loginAs(member)
      .json(payload)

    duplicateResponse.assertStatus(400)
    assert.notInclude(duplicateResponse.text(), 'E_INTERNAL_ERROR')

    const afterDuplicatePackage = (await db
      .from('sprint_review_packages')
      .where('id', reviewPackage.id)
      .select('status', 'submitted_at')
      .firstOrFail()) as Pick<SprintReviewPackageRow, 'status' | 'submitted_at'>
    const managerReviews = (await db
      .from('sprint_manager_reviews')
      .where('package_id', reviewPackage.id)) as Array<Record<string, unknown>>
    const environmentReviews = (await db
      .from('sprint_environment_reviews')
      .where('package_id', reviewPackage.id)) as Array<Record<string, unknown>>

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
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
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
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })
    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('id', 'reviewer_id')) as SprintReviewPackageRow[]

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

    const managerStats = (await db
      .from('reverse_review_target_stats')
      .where('target_type', 'manager')
      .where('target_id', owner.id)
      .firstOrFail()) as ReverseReviewTargetStatsRow
    const organizationStats = (await db
      .from('reverse_review_target_stats')
      .where('target_type', 'organization')
      .where('target_id', org.id)
      .firstOrFail()) as ReverseReviewTargetStatsRow

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

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)) as SprintReviewPackageRow[]
    const openNotifications = (await db
      .from('notification_fanout_targets as target')
      .join('notification_fanout_jobs as job', 'job.id', 'target.job_id')
      .where('job.subject_type', 'project_sprint')
      .where('job.subject_id', sprint.id)
      .select('target.recipient_id as user_id', 'job.notification_type as type')) as Array<{
      user_id: string
      type: string
    }>
    assert.sameMembers(
      openNotifications.map((notification) => notification.user_id),
      [owner.id, member.id]
    )
    for (const reviewPackage of packages) {
      const actor = reviewPackage.reviewer_id === member.id ? member : owner
      const response = await client
        .post(`/api/v1/sprint-review-packages/${reviewPackage.id}/submit`)
        .loginAs(actor)
        .json({
          managerReviews: [],
          environmentReviews: [
            { targetType: 'project', targetId: project.id, rating: 4 },
            { targetType: 'organization', targetId: org.id, rating: 4 },
          ],
        })
      response.assertStatus(201)
    }
    await markSprintReverseReviewWorkflowsDone(sprint.id)

    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(201)

    const sprintAuditLogs = await listAuditLogsByEntity('project_sprint', sprint.id, 10)
    const packageAuditLogBatches = await Promise.all(
      packages.map((reviewPackage) =>
        listAuditLogsByEntity('sprint_review_package', reviewPackage.id, 10)
      )
    )
    const packageAuditLogs = packageAuditLogBatches.flat()

    assert.sameMembers(
      sprintAuditLogs.map((log) => log.action),
      ['open_sprint_review', 'close_sprint_review_period']
    )
    assert.lengthOf(packageAuditLogs, 2)
    assert.isTrue(packageAuditLogs.every((log) => log.action === 'submit_sprint_review_package'))
  })

  test('canonical API expires pending sprint review packages but keeps workflow close gate', async ({
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
      name: 'Expire Sprint Reviews',
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
    await new CloseProjectSprintReviewCommand(
      makeContext(owner.id, org.id),
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({
      sprint_id: sprint.id,
    })

    const expireResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/expire-pending-review-packages`)
      .loginAs(owner)
      .json({ reason: 'review window elapsed' })
    expireResponse.assertStatus(201)

    const expireBody = expireResponse.body() as {
      data: { sprintId: string; expiredPackageCount: number }
    }
    const statuses = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('status')) as Array<{ status: string }>

    assert.equal(expireBody.data.sprintId, sprint.id)
    assert.equal(expireBody.data.expiredPackageCount, 2)
    assert.isTrue(statuses.every((row) => row.status === 'expired'))

    const closeResponse = await client
      .post(`/api/v1/project-sprints/${sprint.id}/close-review-period`)
      .loginAs(owner)
      .json({})
    closeResponse.assertStatus(400)
    assert.include(JSON.stringify(closeResponse.body()), 'unfinished reverse review workflows')
  })
})
