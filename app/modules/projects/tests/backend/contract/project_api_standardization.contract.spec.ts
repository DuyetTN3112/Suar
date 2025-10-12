import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

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

test.group('Contract | Project API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('legacy and v1 project detail endpoints share canonical camelCase response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Canonical Project',
    })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      title: 'Project task',
    })
    const reviewTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      title: 'Project task in review',
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: reviewTask.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const reviewSession = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: owner.id,
      status: 'in_progress',
    })
    await db.table('review_session_reviewer_assignments').insert([
      {
        review_session_id: reviewSession.id,
        reviewer_id: owner.id,
        reviewer_type: 'manager',
        assignment_role: 'creator_required',
        is_required: true,
        status: 'pending',
      },
      {
        review_session_id: reviewSession.id,
        reviewer_id: owner.id,
        reviewer_type: 'peer',
        assignment_role: 'peer_optional',
        is_required: false,
        status: 'pending',
      },
    ])
    await db.table('review_disputes').insert({
      review_session_id: reviewSession.id,
      task_id: reviewTask.id,
      task_assignment_id: assignment.id,
      reviewee_id: owner.id,
      opened_by: owner.id,
      dispute_reason: 'Need second opinion',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
      status: 'admin_reviewing',
    })
    await ReverseReviewFactory.create({
      review_session_id: reviewSession.id,
      reviewer_id: owner.id,
      target_type: 'project',
      target_id: project.id,
      rating: 4,
      comment: 'Project review flow was fair and actionable.',
      is_anonymous: false,
    })

    const legacyResponse = await client.get(`/api/projects/${project.id}`).loginAs(owner)
    const v1Response = await client.get(`/api/v1/projects/${project.id}`).loginAs(owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: {
        project: Record<string, unknown>
        members: Record<string, unknown>[]
        tasks: Record<string, unknown>[]
        tasksSummary: Record<string, unknown>
        projectReverseReviews: Record<string, unknown>
        reviewGovernance: Record<string, unknown>
        recentActivity: unknown[]
        permissions: Record<string, unknown>
      }
    }
    const v1Body = v1Response.body() as typeof legacyBody

    assert.properties(legacyBody.data.project, [
      'id',
      'name',
      'description',
      'organizationId',
      'organizationName',
      'creatorId',
      'creatorName',
      'managerId',
      'managerName',
      'ownerId',
      'ownerName',
      'startDate',
      'endDate',
      'status',
      'visibility',
      'createdAt',
      'updatedAt',
    ])
    assert.notProperty(legacyBody.data.project, 'organization_id')
    assert.notProperty(legacyBody.data.project, 'created_at')
    assert.properties(v1Body.data.project, ['organizationId', 'createdAt', 'updatedAt'])

    const task = legacyBody.data.tasks[0]
    if (!task) {
      throw new Error('Expected project task in canonical detail response')
    }
    assert.properties(task, [
      'id',
      'title',
      'description',
      'status',
      'taskStatusId',
      'priority',
      'assigneeName',
      'dueDate',
    ])
    assert.notProperty(task, 'task_status_id')
    assert.notProperty(task, 'assignee_name')

    assert.properties(legacyBody.data, [
      'project',
      'members',
      'tasks',
      'tasksSummary',
      'projectReverseReviews',
      'reviewGovernance',
      'recentActivity',
      'permissions',
    ])
    assert.properties(legacyBody.data.projectReverseReviews, [
      'totalReviews',
      'anonymousReviews',
      'averageRating',
      'recent',
    ])
    assert.equal(legacyBody.data.projectReverseReviews['totalReviews'], 1)
    assert.equal(legacyBody.data.projectReverseReviews['anonymousReviews'], 0)
    assert.equal(legacyBody.data.projectReverseReviews['averageRating'], 4)
    assert.properties(legacyBody.data.reviewGovernance, [
      'totalSessions',
      'pendingSessions',
      'overdueSessions',
      'disputedSessions',
      'completedSessions',
      'requiredPendingAssignments',
      'fallbackPendingAssignments',
      'completionRate',
    ])
    assert.notProperty(legacyBody.data, 'tasks_summary')
    assert.notProperty(legacyBody.data, 'recent_activity')
  })

  test('org members outside project only receive preview project detail without internal collections', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const outsider = await UserFactory.create({
      current_organization_id: org.id,
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: outsider.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Previewable Project',
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      project_id: project.id,
      title: 'Internal task',
    })

    const response = await client.get(`/api/projects/${project.id}`).loginAs(outsider)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        project: {
          id: string
          name: string
          creatorId: string | null
          creatorName: string | null
          managerId: string | null
          managerName: string | null
          ownerId: string | null
          ownerName: string | null
        }
        members: unknown[]
        tasks: unknown[]
        tasksSummary: Record<string, unknown>
        projectReverseReviews: Record<string, unknown>
        reviewGovernance: Record<string, unknown>
        recentActivity: unknown[]
        permissions: {
          isMember: boolean
          canEdit: boolean
          canDelete: boolean
          canAddMembers: boolean
        }
      }
    }

    assert.equal(body.data.project.id, project.id)
    assert.equal(body.data.project.name, 'Previewable Project')
    assert.isNull(body.data.project.creatorId)
    assert.isNull(body.data.project.creatorName)
    assert.isNull(body.data.project.managerId)
    assert.isNull(body.data.project.managerName)
    assert.isNull(body.data.project.ownerId)
    assert.isNull(body.data.project.ownerName)
    assert.deepEqual(body.data.members, [])
    assert.deepEqual(body.data.tasks, [])
    assert.deepEqual(body.data.recentActivity, [])
    assert.deepEqual(body.data.tasksSummary, {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0,
    })
    assert.equal(body.data.projectReverseReviews['totalReviews'], 0)
    assert.equal(body.data.reviewGovernance['totalSessions'], 0)
    assert.isFalse(body.data.permissions.isMember)
    assert.isFalse(body.data.permissions.canEdit)
    assert.isFalse(body.data.permissions.canDelete)
    assert.isFalse(body.data.permissions.canAddMembers)
  })

  test('legacy and v1 project update endpoints share canonical wrapped data shape', async ({
    assert,
    client,
  }) => {
    const { org: legacyOrg, owner: legacyOwner } = await OrganizationFactory.createWithOwner()
    const legacyProject = await ProjectFactory.create({
      organization_id: legacyOrg.id,
      creator_id: legacyOwner.id,
      owner_id: legacyOwner.id,
      name: 'Legacy Project',
    })

    const { org: v1Org, owner: v1Owner } = await OrganizationFactory.createWithOwner()
    const v1Project = await ProjectFactory.create({
      organization_id: v1Org.id,
      creator_id: v1Owner.id,
      owner_id: v1Owner.id,
      name: 'V1 Project',
    })

    const payload = {
      name: 'Updated Project',
      description: 'Canonical body',
    }

    const legacyResponse = await client
      .put(`/api/projects/${legacyProject.id}`)
      .json(payload)
      .loginAs(legacyOwner)
    const v1Response = await client
      .patch(`/api/v1/projects/${v1Project.id}`)
      .json(payload)
      .loginAs(v1Owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: { id: string; name: string; description: string | null; organizationId: string }
    }
    const v1Body = v1Response.body() as typeof legacyBody

    assert.equal(legacyBody.data.id, legacyProject.id)
    assert.equal(legacyBody.data.name, payload.name)
    assert.equal(v1Body.data.id, v1Project.id)
    assert.equal(v1Body.data.name, payload.name)
    assert.notProperty(legacyBody.data, 'organization_id')
    assert.property(legacyBody.data, 'organizationId')
  })

  test('legacy project PATCH alias preserves canonical update contract', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Legacy Patch Project',
    })

    const payload = {
      name: 'Legacy Patch Updated Project',
      description: 'PATCH alias on compat route',
    }

    const response = await client.patch(`/api/projects/${project.id}`).json(payload).loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as {
      data: { id: string; name: string; description: string | null; organizationId: string }
    }

    assert.equal(body.data.id, project.id)
    assert.equal(body.data.name, payload.name)
    assert.equal(body.data.description, payload.description)
    assert.property(body.data, 'organizationId')
    assert.notProperty(body.data, 'organization_id')
  })

  test('legacy and v1 project delete endpoints both return 204', async ({ client }) => {
    const { org: legacyOrg, owner: legacyOwner } = await OrganizationFactory.createWithOwner()
    const legacyProject = await ProjectFactory.create({
      organization_id: legacyOrg.id,
      creator_id: legacyOwner.id,
      owner_id: legacyOwner.id,
      name: 'Legacy Delete Project',
    })

    const { org: v1Org, owner: v1Owner } = await OrganizationFactory.createWithOwner()
    const v1Project = await ProjectFactory.create({
      organization_id: v1Org.id,
      creator_id: v1Owner.id,
      owner_id: v1Owner.id,
      name: 'V1 Delete Project',
    })

    const legacyResponse = await client
      .delete(`/api/projects/${legacyProject.id}`)
      .loginAs(legacyOwner)
    const v1Response = await client.delete(`/api/v1/projects/${v1Project.id}`).loginAs(v1Owner)

    legacyResponse.assertStatus(204)
    v1Response.assertStatus(204)
  })
})
