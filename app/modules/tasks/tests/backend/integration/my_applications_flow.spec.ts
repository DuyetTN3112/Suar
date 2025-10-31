import { test } from '@japa/runner'

import UnauthorizedException from '#modules/http/exceptions/unauthorized_exception'
import GetMyApplicationsQuery from '#modules/tasks/actions/queries/get_my_applications_query'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  TaskApplicationFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

interface ApplicationRecord {
  applicant_id: string
  application_status: string
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
    const query = new GetMyApplicationsQuery(ctx)
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
    const query = new GetMyApplicationsQuery(ctx)
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
    const query = new GetMyApplicationsQuery(ctx)

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
    const query = new GetMyApplicationsQuery(ctx)
    const result = await query.handle({
      status: 'pending',
      page: 1,
      per_page: 20,
    })

    assert.property(result, 'data')
    assert.isTrue(result.data.every((a) => (a as ApplicationRecord).application_status === 'pending'))
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
    const query = new GetMyApplicationsQuery(ctx)
    const result = await query.handle({
      status: 'pending',
      page: 1,
      per_page: 20,
    })

    assert.isTrue(result.data.every((a) => (a as ApplicationRecord).application_status !== 'withdrawn'))
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
    const query = new GetMyApplicationsQuery(ctx)
    const result = await query.handle({
      status: 'all',
      page: 1,
      per_page: 20,
    })

    assert.isTrue(result.data.some((a) => (a as ApplicationRecord).application_status === 'withdrawn'))
  })
