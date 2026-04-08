import { test } from '@japa/runner'

import ForbiddenException from '#modules/http/exceptions/forbidden_exception'
import GetTaskApplicationsQuery from '#modules/tasks/actions/queries/get_task_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Task Application Access', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('task creator can view applications', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const ctx = makeSystemTaskActionContext(owner.id)
    const query = new GetTaskApplicationsQuery(ctx)
    const result = await query.handle({
      task_id: task.id,
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.property(result, 'meta')
  })

  test('project owner can view applications for project task', async ({ assert }) => {
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

    const ctx = makeSystemTaskActionContext(owner.id)
    const query = new GetTaskApplicationsQuery(ctx)
    const result = await query.handle({
      task_id: task.id,
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.property(result, 'meta')
  })

  test('project manager can view applications for project task', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const manager = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: manager.id,
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
      user_id: manager.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })

    const ctx = makeSystemTaskActionContext(manager.id)
    const query = new GetTaskApplicationsQuery(ctx)
    const result = await query.handle({
      task_id: task.id,
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.property(result, 'meta')
  })

  test('random org member cannot view applications for task they do not own', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const otherMember = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherMember.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const ctx = makeSystemTaskActionContext(otherMember.id)
    const query = new GetTaskApplicationsQuery(ctx)

    await assert.rejects(
      () =>
        query.handle({
          task_id: task.id,
          status: 'all',
          page: 1,
          per_page: 20,
        }),
      ForbiddenException
    )
  })

  test('unauthenticated user cannot view applications', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const ctx = { userId: null, ip: '0.0.0.0', userAgent: 'system', organizationId: null }
    const query = new GetTaskApplicationsQuery(ctx)

    await assert.rejects(
      () =>
        query.handle({
          task_id: task.id,
          status: 'all',
          page: 1,
          per_page: 20,
        }),
      ForbiddenException
    )
  })
})

  test('foreign org recruiter cannot view task applications', async ({ assert }) => {
    const { org: org1, owner: owner1 } = await OrganizationFactory.createWithOwner()
    const { org: org2 } = await OrganizationFactory.createWithOwner()

    const recruiter = await UserFactory.create({ current_organization_id: org2.id })
    await OrganizationUserFactory.create({
      organization_id: org2.id,
      user_id: recruiter.id,
      org_role: 'org_owner',
      status: 'approved',
    })

    const task = await TaskFactory.create({
      organization_id: org1.id,
      creator_id: owner1.id,
    })

    const ctx = makeSystemTaskActionContext(recruiter.id)
    const query = new GetTaskApplicationsQuery(ctx)

    await assert.rejects(
      () =>
        query.handle({
          task_id: task.id,
          status: 'all',
          page: 1,
          per_page: 20,
        }),
      ForbiddenException
    )
  })
