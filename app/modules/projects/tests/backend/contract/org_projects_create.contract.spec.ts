import router from '@adonisjs/core/services/router'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
} from '#tests/helpers/factories'

interface ProjectCreateSuccessBody {
  data: {
    id: string
    name: string
    status: string
    organizationId: string
  }
}

interface ProjectCreateErrorBody {
  message?: string
  error?: {
    message?: string
    code?: string
  }
}

test.group('Contract | POST /org/projects', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('resolves the create page instead of treating create as a project UUID', ({
    assert,
  }) => {
    const matchedRoute = router.match('/org/projects/create', 'GET', true)
    const matchedDetailRoute = router.match(
      '/org/projects/00000000-0000-4000-8000-000000000000',
      'GET',
      true
    )

    assert.equal(matchedRoute?.route.name, 'org.projects.create')
    assert.equal(matchedDetailRoute?.route.name, 'org.projects.show')
  })

  test('creates project with each valid status and returns serialized payload', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'] as const

    for (const [index, status] of validStatuses.entries()) {
      const response = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
        name: `Contract Status ${index}-${Date.now()}`,
        description: 'HTTP contract status validation',
        status,
      })

      response.assertStatus(201)

      const body = response.body() as ProjectCreateSuccessBody
      assert.equal(body.data.status, status)
      assert.equal(body.data.organizationId, org.id)
      assert.isString(body.data.id)
      assert.notProperty(body, 'success')
    }
  }).timeout(15000)

  test('defaults to pending when status is omitted', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const response = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: `Contract Default ${Date.now()}`,
      description: 'Missing status should default to pending',
    })

    response.assertStatus(201)

    const body = response.body() as ProjectCreateSuccessBody
    assert.equal(body.data.status, 'pending')
    assert.equal(body.data.organizationId, org.id)
    assert.notProperty(body, 'success')
  })

  test('treats empty status as omitted and still defaults to pending', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: `Contract Empty ${Date.now()}`,
      description: 'Empty status should be normalized away',
      status: '',
    })

    response.assertStatus(201)

    const body = response.body() as ProjectCreateSuccessBody
    assert.equal(body.data.status, 'pending')
  })

  test('rejects legacy and malformed status values with validation error', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const invalidStatuses = [
      'active',
      'on_hold',
      'archived',
      'ACTIVE',
      'PENDING',
      'foobar',
      "'; DROP TABLE projects;--",
      '12345',
      'pending%20in_progress',
      'dang_chay',
      'pending\x00',
      'pending'.repeat(100),
      'invalid_status',
    ]

    for (const [index, status] of invalidStatuses.entries()) {
      const response = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
        name: `Contract Invalid ${index}-${Date.now()}`,
        description: 'Invalid status should fail',
        status,
      })

      assert.equal(response.status(), 422, `status=${JSON.stringify(status)}`)

      const body = response.body() as ProjectCreateErrorBody
      const message = body.message ?? body.error?.message ?? ''
      assert.match(message, /trạng thái|status|không hợp lệ/i)
    }
  })

  test('trims whitespace-padded valid status and accepts it', async ({ assert, client }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: `Contract Trimmed ${Date.now()}`,
      description: 'Whitespace should be normalized by HTTP input layer',
      status: ' pending ',
    })

    response.assertStatus(201)

    const body = response.body() as ProjectCreateSuccessBody
    assert.equal(body.data.status, 'pending')
  })

  test('allows duplicate names but rejects blank and overly long names', async ({
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()
    const duplicateName = `Duplicate Name ${Date.now()}`

    const first = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: duplicateName,
      description: 'first duplicate',
      status: 'pending',
    })
    first.assertStatus(201)

    const second = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: duplicateName,
      description: 'second duplicate',
      status: 'pending',
    })
    second.assertStatus(201)

    const blankName = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: '   ',
      description: 'blank should fail',
      status: 'pending',
    })
    blankName.assertStatus(422)

    const longName = await client.post('/org/projects').loginAs(owner).header('accept', 'application/json').json({
      name: 'A'.repeat(101),
      description: 'long should fail',
      status: 'pending',
    })
    longName.assertStatus(422)
  }).timeout(10000)
})
