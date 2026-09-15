import { test } from '@japa/runner'

import {
  configureMarketplaceTestGroup,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from './support/marketplace_test_support.js'

test.group('Integration | Marketplace module browsing & routing', (group) => {
  configureMarketplaceTestGroup(group)

  test('public marketplace task page allows anonymous filter-only browsing', async ({ client }) => {
    const response = await client.get('/marketplace/tasks')

    response.assertStatus(200)
  })

  test('public marketplace task page keeps a difficulty filter server-renderable', async ({
    client,
  }) => {
    const response = await client.get('/marketplace/tasks?difficulty=easy')

    response.assertStatus(200)
  })

  test('marketplace applicant can open the public task detail without organization access', async ({
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.createExternalContributor()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: 'public',
      allow_external_contributors: true,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client
      .get(`/marketplace/tasks/${task.id}`)
      .redirects(0)
      .loginAs(applicant)

    response.assertStatus(200)
  })

  test('/marketplace redirects to canonical marketplace tasks route', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/marketplace').redirects(0).loginAs(viewer)

    response.assertStatus(302)
    assert.equal(response.header('location'), '/marketplace/tasks')
  })

  test('legacy marketplace talent routes redirect to org recruiting surfaces', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const talentsResponse = await client.get('/marketplace/talents').redirects(0).loginAs(viewer)
    talentsResponse.assertStatus(302)
    assert.equal(talentsResponse.header('location'), '/org/talents')

    const bookmarksResponse = await client
      .get('/marketplace/bookmarks')
      .redirects(0)
      .loginAs(viewer)
    bookmarksResponse.assertStatus(302)
    assert.equal(bookmarksResponse.header('location'), '/org/bookmarks')
  })

  test('org member cannot open recruiter talent and bookmark workspaces', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const talentsResponse = await client.get('/org/talents').redirects(0).loginAs(member)
    talentsResponse.assertStatus(302)
    assert.equal(talentsResponse.header('location'), '/marketplace/tasks')

    const bookmarksResponse = await client.get('/org/bookmarks').redirects(0).loginAs(member)
    bookmarksResponse.assertStatus(302)
    assert.equal(bookmarksResponse.header('location'), '/marketplace/tasks')
  })

  test('org admins can open recruiter talent and bookmark workspaces', async ({ client }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const admin = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: admin.id,
      org_role: 'org_admin',
      status: 'approved',
    })

    const talentsResponse = await client.get('/org/talents').loginAs(admin)
    talentsResponse.assertStatus(200)

    const bookmarksResponse = await client.get('/org/bookmarks').loginAs(admin)
    bookmarksResponse.assertStatus(200)
  })

  test('marketplace module API keeps canonical marketplace tasks response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Marketplace projection project',
      visibility: 'public',
      allow_external_contributors: true,
    })

    const visibleTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Marketplace owned task',
      description: 'Visible through marketplace module route',
      task_visibility: 'external',
      assigned_to: null,
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Marketplace hidden internal task',
      description: 'Hidden through marketplace module route',
      task_visibility: 'internal',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{
        id: string
        title: string
        can_review_applications?: boolean
        creator?: Record<string, unknown> | null
        project?: {
          id?: string
          name?: string
          owner_id?: string | null
          owner?: Record<string, unknown> | null
        } | null
        organization?: Record<string, unknown> | null
      }>
      pagination: { page: number; perPage: number; total: number }
    }

    assert.notProperty(body, 'success')
    const visibleTaskBody = body.data.find((task) => task.id === visibleTask.id)
    assert.exists(visibleTaskBody)
    assert.isFalse(visibleTaskBody?.can_review_applications ?? true)
    assert.deepInclude(visibleTaskBody?.creator ?? {}, {
      id: owner.id,
      username: owner.username,
    })
    assert.notProperty(visibleTaskBody?.creator ?? {}, 'email')
    assert.notProperty(visibleTaskBody?.creator ?? {}, 'avatar_url')
    assert.deepInclude(visibleTaskBody?.project ?? {}, {
      id: project.id,
      name: project.name,
      owner_id: owner.id,
    })
    assert.deepInclude(visibleTaskBody?.project?.owner ?? {}, {
      id: owner.id,
      username: owner.username,
    })
    assert.notProperty(visibleTaskBody?.project?.owner ?? {}, 'email')
    assert.notProperty(visibleTaskBody?.project?.owner ?? {}, 'avatar_url')
    assert.deepInclude(visibleTaskBody?.organization ?? {}, {
      id: org.id,
      name: org.name,
      logo: org.logo ?? null,
    })
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'owner_id')
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'custom_roles')
    assert.notProperty(visibleTaskBody?.organization ?? {}, 'partner_verification_proof')
    assert.notExists(body.data.find((task) => task.title === 'Marketplace hidden internal task'))
    assert.deepInclude(body.pagination, { page: 1, perPage: 20, total: 1 })
  })

  test('marketplace module API returns an empty result when no visible tasks exist', async ({
    assert,
    client,
  }) => {
    const { org } = await OrganizationFactory.createWithOwner()
    const viewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: viewer.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    response.assertStatus(200)

    const body = response.body() as {
      data: unknown[]
      pagination: { page: number; perPage: number; total: number }
    }

    assert.deepEqual(body.data, [])
    assert.deepInclude(body.pagination, { page: 1, perPage: 20, total: 0 })
  })

  test('marketplace task listing marks project managers as proposal reviewers', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create({ current_organization_id: null })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      visibility: 'public',
      allow_external_contributors: true,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: manager.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
      title: 'Project manager reviews from marketplace listing',
      task_visibility: 'external',
      assigned_to: null,
    })

    const response = await client.get('/api/v1/marketplace/tasks').loginAs(manager)
    response.assertStatus(200)

    const body = response.body() as {
      data: Array<{ id: string; can_review_applications?: boolean }>
    }
    const listedTask = body.data.find((item) => item.id === task.id)

    assert.exists(listedTask)
    assert.isTrue(listedTask?.can_review_applications ?? false)
  })
})
