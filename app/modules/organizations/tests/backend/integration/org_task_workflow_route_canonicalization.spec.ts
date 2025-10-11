import { test } from '@japa/runner'

import TaskStatus from '#modules/tasks/infra/models/task_status'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

test.group('Integration | Org task workflow route canonicalization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('canonical and legacy workflow pages both resolve for org admins', async ({ client }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const canonicalResponse = await client.get('/org/tasks/workflow').loginAs(owner)
    const legacyResponse = await client.get('/org/workflow/statuses').loginAs(owner)

    canonicalResponse.assertStatus(200)
    legacyResponse.assertStatus(200)
  })

  test('canonical workflow create endpoint returns wrapped JSON payload', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/org/tasks/workflow')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        name: 'Ready for handoff',
        group: 'in_progress',
        color: '#654321',
        sortOrder: 88,
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
        sortOrder: number | null
        isDefault: boolean
      }
    }

    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'Ready for handoff')
    assert.equal(body.data.sortOrder, 88)
    assert.isFalse(body.data.isDefault)

    const createdStatus = await TaskStatus.query().where('id', body.data.id).first()
    assert.isNotNull(createdStatus)
    assert.equal(createdStatus?.organization_id, org.id)
    assert.equal(createdStatus?.sort_order, 88)
  })

  test('legacy workflow create alias remains compatible', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/org/workflow/statuses')
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        name: 'Legacy alias status',
        group: 'todo',
        color: '#123456',
      })

    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        organizationId: string
        name: string
      }
    }

    assert.equal(body.data.organizationId, org.id)
    assert.equal(body.data.name, 'Legacy alias status')
  })
})
