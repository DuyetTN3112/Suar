import { test } from '@japa/runner'

import { taskApplicationCapability } from '#composition/tasks/task-application/task_application_capability_composition'
import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/task-applications/get_my_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

interface ApplicationRecord {
  applicant_id: string
  application_status: string
  task?: {
    organization?: Record<string, unknown> | null
    project?: Record<string, unknown> | null
  }
}

test.group('Integration | My Applications Flow', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('authenticated user can list own applications', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    const ctx = makeSystemTaskActionContext(applicant.id)
    const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)
    const result = await query.handle({
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.property(result, 'meta')
    assert.isTrue(result.data.length > 0)
    assert.isTrue(result.data.every((a) => (a as ApplicationRecord).applicant_id === applicant.id))
  })

  test('public capability exposes only marketplace-owned task labels', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
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
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    const result = await taskApplicationCapability.listForCurrentApplicant(
      makeSystemTaskActionContext(applicant.id),
      {
        status: 'all',
        page: 1,
        perPage: 20,
      }
    )
    assert.isTrue(result.isSuccess())
    const application = result.getValue().data.find((candidate) => candidate.taskId === task.id)

    assert.deepInclude(application?.task ?? {}, {
      id: task.id,
      title: task.title,
      organizationName: org.name,
      projectName: project.name,
    })
    assert.notProperty(application?.task ?? {}, 'organization')
    assert.notProperty(application?.task ?? {}, 'project')
    assert.notProperty(application?.task ?? {}, 'description')
  })

  test('applications are paginated', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    const ctx = makeSystemTaskActionContext(applicant.id)
    const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)
    const result = await query.handle({
      status: 'all',
      page: 1,
      per_page: 10,
    })

    assert.property(result.meta, 'total')
    assert.property(result.meta, 'per_page')
    assert.property(result.meta, 'current_page')
    assert.property(result.meta, 'last_page')
    assert.equal(result.meta.per_page, 10)
  })

  test('unauthenticated user cannot list applications', async ({ assert }) => {
    const ctx = { userId: null, ip: '0.0.0.0', userAgent: 'system', organizationId: null }
    const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)

    await assert.rejects(
      () =>
        query.handle({
          status: 'all',
          page: 1,
          per_page: 20,
        }),
      UnauthorizedException
    )
  })

  test('status filter works correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskApplicationFactory.create({
      task_id: task.id,
      applicant_id: applicant.id,
    })

    const ctx = makeSystemTaskActionContext(applicant.id)
    const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)
    const result = await query.handle({
      status: 'pending',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.isTrue(
      result.data.every((a) => (a as ApplicationRecord).application_status === 'pending')
    )
  })
})

test('withdrawn application is excluded from active list', async ({ assert }) => {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const applicant = await UserFactory.create()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  await TaskApplicationFactory.create({
    task_id: task.id,
    applicant_id: applicant.id,
    application_status: 'withdrawn',
  })

  const ctx = makeSystemTaskActionContext(applicant.id)
  const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)
  const result = await query.handle({
    status: 'pending',
    page: 1,
    per_page: 20,
  })

  assert.isTrue(
    result.data.every((a) => (a as ApplicationRecord).application_status !== 'withdrawn')
  )
})

test('withdrawn application appears in all-status list', async ({ assert }) => {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const applicant = await UserFactory.create()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
  })
  await TaskApplicationFactory.create({
    task_id: task.id,
    applicant_id: applicant.id,
    application_status: 'withdrawn',
  })

  const ctx = makeSystemTaskActionContext(applicant.id)
  const query = new GetMyApplicationsQuery(ctx, taskExternalDeps.lifecycle)
  const result = await query.handle({
    status: 'all',
    page: 1,
    per_page: 20,
  })

  assert.isTrue(
    result.data.some((a) => (a as ApplicationRecord).application_status === 'withdrawn')
  )
})
