import { test } from '@japa/runner'

import { setupDualOrgUserWithRefreshedToken } from './support/testing_auth_tokens_fixtures.js'

import { userRecruiterBookmarkActionFactory } from '#composition/users/user-factories/user_action_factory'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskStatusModel from '#modules/tasks/infra/models/task-status/task_status'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationUserFactory,
  ProjectFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'


test.group('Integration | Auth Bearer Token Organization Context', (group) => {
  group.setup(async () => {
    await setupApp()
  })

  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('bearer token can access project detail in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { secondaryOrg, owner, accessToken } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Project Org',
      'bearer-project-org'
    )

    const project = await ProjectFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      owner_id: owner.id,
      name: 'Bearer Project Detail',
    })

    const projectResponse = await client
      .get(`/api/projects/${project.id}`)
      .header('authorization', `Bearer ${accessToken}`)

    projectResponse.assertStatus(200)

    const projectBody = projectResponse.body() as {
      data: {
        project: {
          id: string
          organizationId: string
        }
      }
    }

    assert.equal(projectBody.data.project.id, project.id)
    assert.equal(projectBody.data.project.organizationId, secondaryOrg.id)
  })

  test('bearer token can list task statuses in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { secondaryOrg, owner, accessToken } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Status Org',
      'bearer-status-org'
    )

    await TaskFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Seed status for bearer route',
    })

    const statusesResponse = await client
      .get('/api/v1/task-statuses')
      .header('authorization', `Bearer ${accessToken}`)

    statusesResponse.assertStatus(200)

    const statusesBody = statusesResponse.body() as {
      data: {
        organizationId: string
      }[]
    }

    assert.isAbove(statusesBody.data.length, 0)
    assert.isTrue(statusesBody.data.every((status) => status.organizationId === secondaryOrg.id))
  })

  test('bearer token uses refreshed organization for canonical and deprecated current-organization users APIs', async ({
    assert,
    client,
  }) => {
    const { primaryOrg, secondaryOrg, accessToken } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Users Org',
      'bearer-users-org'
    )

    const primaryMember = await UserFactory.create({
      email: `primary-member-${Date.now()}@test.example.com`,
    })
    await OrganizationUserFactory.create({
      organization_id: primaryOrg.id,
      user_id: primaryMember.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const secondaryMember = await UserFactory.create({
      email: `secondary-member-${Date.now()}@test.example.com`,
    })
    await OrganizationUserFactory.create({
      organization_id: secondaryOrg.id,
      user_id: secondaryMember.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const canonicalUsersResponse = await client
      .get('/api/v1/me/organizations/current/users')
      .header('authorization', `Bearer ${accessToken}`)

    canonicalUsersResponse.assertStatus(200)
    assert.isUndefined(canonicalUsersResponse.header('deprecation'))

    const usersBody = canonicalUsersResponse.body() as {
      data: {
        email: string | null
      }[]
    }

    const emails = usersBody.data
      .map((user) => user.email)
      .filter((email): email is string => typeof email === 'string')
    const secondaryEmail = secondaryMember.email
    const primaryEmail = primaryMember.email
    if (typeof secondaryEmail !== 'string' || typeof primaryEmail !== 'string') {
      throw new Error('Expected seeded member emails to be strings')
    }
    assert.include(emails, secondaryEmail)
    assert.notInclude(emails, primaryEmail)

    const aliasUsersResponse = await client
      .get('/api/users-in-organization')
      .header('authorization', `Bearer ${accessToken}`)

    aliasUsersResponse.assertStatus(200)
    assert.equal(aliasUsersResponse.header('deprecation'), 'true')
    assert.equal(
      aliasUsersResponse.header('link'),
      '</api/me/organizations/current/users>; rel="successor-version"'
    )

    const aliasUsersBody = aliasUsersResponse.body() as typeof usersBody
    assert.deepEqual(aliasUsersBody, usersBody)
  })

  test('bearer token can access recruiter bookmarks in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { primaryOrg, accessToken, owner } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Bookmark Org',
      'bearer-bookmark-org'
    )

    const talent = await UserFactory.create({
      email: `bookmark-talent-${Date.now()}@test.example.com`,
    })

    const createBookmark = userRecruiterBookmarkActionFactory.makeCreate({
      ...makeSystemReviewActionContext(owner.id),
      organizationId: primaryOrg.id,
    })
    await createBookmark.handle({
      talent_user_id: talent.id,
      notes: 'Bearer bookmark note',
      folder: 'Pipeline',
      rating: 4,
    })

    const bookmarksResponse = await client
      .get('/api/recruiter-bookmarks')
      .header('authorization', `Bearer ${accessToken}`)

    bookmarksResponse.assertStatus(200)

    const bookmarksBody = bookmarksResponse.body() as {
      data: Array<{
        talentUserId: string
        notes: string | null
      }>
    }

    assert.isAbove(bookmarksBody.data.length, 0)
    assert.isTrue(
      bookmarksBody.data.some(
        (bookmark) =>
          bookmark.talentUserId === talent.id && bookmark.notes === 'Bearer bookmark note'
      )
    )
  })

  test('bearer token can list grouped tasks in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { primaryOrg, secondaryOrg, owner, accessToken } =
      await setupDualOrgUserWithRefreshedToken(
        client,
        'Bearer Grouped Org',
        'bearer-grouped-org'
      )

    const primaryTask = await TaskFactory.create({
      organization_id: primaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Primary org task',
    })

    const secondaryTask = await TaskFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'in_progress',
      title: 'Secondary org grouped task',
    })

    const groupedResponse = await client
      .get('/api/tasks/grouped')
      .header('authorization', `Bearer ${accessToken}`)

    groupedResponse.assertStatus(200)

    const groupedBody = groupedResponse.body() as {
      data: Record<
        string,
        {
          id: string
        }[]
      >
    }

    const taskIds = Object.values(groupedBody.data).flatMap((tasks) => tasks.map((task) => task.id))
    assert.include(taskIds, secondaryTask.id)
    assert.notInclude(taskIds, primaryTask.id)
  })

  test('bearer token can update task status definition in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { secondaryOrg, owner, accessToken } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Status Mutation Org',
      'bearer-status-mutation-org'
    )

    await TaskFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Seed status definition for mutation test',
    })

    const status = await TaskStatusModel.query()
      .where('organization_id', secondaryOrg.id)
      .where('slug', 'todo')
      .firstOrFail()

    const updateResponse = await client
      .put(`/api/task-statuses/${status.id}`)
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Todo Bearer Updated',
        color: '#123456',
      })

    updateResponse.assertStatus(200)

    const updateBody = updateResponse.body() as {
      data: {
        id: string
        name: string
        color: string
      }
    }

    assert.equal(updateBody.data.id, status.id)
    assert.equal(updateBody.data.name, 'Todo Bearer Updated')
    assert.equal(updateBody.data.color, '#123456')

    const refreshedStatus = await TaskStatusModel.findOrFail(status.id)
    assert.equal(refreshedStatus.name, 'Todo Bearer Updated')
    assert.equal(refreshedStatus.color, '#123456')
  })

  test('bearer token can batch update task statuses in refreshed organization context', async ({
    assert,
    client,
  }) => {
    const { secondaryOrg, owner, accessToken } = await setupDualOrgUserWithRefreshedToken(
      client,
      'Bearer Batch Status Org',
      'bearer-batch-status-org'
    )

    const taskA = await TaskFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Batch task A',
    })
    const taskB = await TaskFactory.create({
      organization_id: secondaryOrg.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Batch task B',
    })

    const inProgressStatus = await TaskStatusModel.query()
      .where('organization_id', secondaryOrg.id)
      .where('slug', 'in_progress')
      .firstOrFail()

    const batchResponse = await client
      .patch('/api/tasks/batch-status')
      .header('authorization', `Bearer ${accessToken}`)
      .json({
        task_ids: [taskA.id, taskB.id],
        task_status_id: inProgressStatus.id,
      })

    batchResponse.assertStatus(200)

    const batchBody = batchResponse.body() as {
      data: {
        updated: number
        failed: string[]
      }
    }

    assert.equal(batchBody.data.updated, 2)
    assert.deepEqual(batchBody.data.failed, [])

    const refreshedTaskA = await Task.findOrFail(taskA.id)
    const refreshedTaskB = await Task.findOrFail(taskB.id)
    assert.equal(refreshedTaskA.task_status_id, inProgressStatus.id)
    assert.equal(refreshedTaskB.task_status_id, inProgressStatus.id)
  })
})
