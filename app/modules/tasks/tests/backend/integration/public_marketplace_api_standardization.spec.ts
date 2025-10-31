import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Integration | Public marketplace tasks API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('canonical v1 marketplace tasks API preserves legacy wrapped contract', async ({
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

    const visibleTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Public marketplace task',
      description: 'Visible through marketplace API',
      task_visibility: 'external',
      assigned_to: null,
    })

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Internal hidden task',
      description: 'Should not be visible through marketplace API',
      task_visibility: 'internal',
      assigned_to: null,
    })

    const legacyResponse = await client.get('/api/marketplace/tasks').loginAs(viewer)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client.get('/api/v1/marketplace/tasks').loginAs(viewer)
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: Array<{
        id: string
        title: string
      }>
      pagination: {
        page: number
        perPage: number
        total: number
        hasNextPage: boolean
        hasPreviousPage: boolean
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.notProperty(legacyBody, 'success')
    assert.notProperty(canonicalBody, 'success')
    assert.deepEqual(canonicalBody, legacyBody)

    const visible = canonicalBody.data.find((task) => task.id === visibleTask.id)
    assert.exists(visible)
    assert.equal(visible?.title, 'Public marketplace task')
    assert.deepInclude(canonicalBody.pagination, {
      total: 1,
      page: 1,
      perPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,
    })
  })
})
