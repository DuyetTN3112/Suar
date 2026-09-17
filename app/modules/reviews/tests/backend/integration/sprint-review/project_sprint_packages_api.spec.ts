import { test } from '@japa/runner'

import {
  CloseProjectSprintReviewCommand,
  configureCloseProjectSprintReviewTestGroup,
  DateTime,
  db,
  makeContext,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  reviewCryptography,
  sprintPackageMutationUnitOfWork,
  type SprintReviewPackageRow,
  TaskFactory,
  testId,
  UserFactory,
} from '../support/close_project_sprint_review_test_support.js'

test.group('Integration | Project sprint packages API', (group) => {
  configureCloseProjectSprintReviewTestGroup(group)

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
})
