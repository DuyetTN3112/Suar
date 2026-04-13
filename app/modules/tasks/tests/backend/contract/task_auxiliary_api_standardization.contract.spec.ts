import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import RedisCacheStore from '#modules/cache/infra/redis_cache_store'
import {
  CACHE_COLLECTION_GENERATION_NAMESPACES,
  entityCacheGenerationNamespaces,
} from '#modules/cache/public_contracts/cache_contract'
import TaskStatusScenario from '#modules/tasks/tests/backend/support/task_status_scenario'
import User from '#modules/users/infra/models/user'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

test.group('Contract | Task auxiliary API standardization', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('check-create-permission endpoint returns wrapped permission payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.get('/api/tasks/check-create-permission').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        canCreate: boolean
        reason: string | null
        code: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.deepEqual(body, {
      data: {
        canCreate: true,
        reason: null,
        code: null,
      },
    })
  })

  test('check-create-permission endpoint accepts camelCase projectId query input', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
    })

    const response = await client
      .get('/api/tasks/check-create-permission')
      .loginAs(owner)
      .qs({ projectId: task.project_id })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        canCreate: boolean
        reason: string | null
        code: string | null
      }
    }

    assert.isTrue(body.data.canCreate)
    assert.isNull(body.data.reason)
    assert.isNull(body.data.code)
  })

  test('v1 check-create-permission endpoint preserves legacy wrapped payload', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const legacyResponse = await client.get('/api/tasks/check-create-permission').loginAs(owner)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client
      .get('/api/v1/tasks/check-create-permission')
      .loginAs(owner)
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as {
      data: {
        canCreate: boolean
        reason: string | null
        code: string | null
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.deepEqual(canonicalBody, legacyBody)
  })

  test('task audit logs endpoint returns wrapped data collection without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Task audit log contract task',
    })

    await db.table('audit_events').insert({
      user_id: owner.id,
      action: 'task_updated',
      entity_type: 'task',
      entity_id: task.id,
      old_values: JSON.stringify({ title: 'Old title' }),
      new_values: JSON.stringify({ title: 'Task audit log contract task' }),
      ip_address: '127.0.0.1',
      user_agent: 'contract-test',
      occurred_at: new Date(),
    })

    const response = await client.get(`/api/tasks/${task.id}/audit-logs`).loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        action: string
        user: { id: string; name: string; email: string } | null
        changes: { field: string; oldValue: unknown; newValue: unknown }[]
      }[]
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)
    assert.equal(body.data[0]?.action, 'task_updated')
    assert.equal(body.data[0]?.user?.id, owner.id)
    assert.deepInclude(body.data[0]?.changes ?? [], {
      field: 'title',
      oldValue: 'Old title',
      newValue: 'Task audit log contract task',
    })
  })

  test('v1 task audit logs endpoint preserves legacy wrapped collection contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Task audit log parity task',
    })

    await db.table('audit_events').insert({
      user_id: owner.id,
      action: 'task_updated',
      entity_type: 'task',
      entity_id: task.id,
      old_values: JSON.stringify({ title: 'Old task audit log title' }),
      new_values: JSON.stringify({ title: 'Task audit log parity task' }),
      ip_address: '127.0.0.1',
      user_agent: 'contract-test',
      occurred_at: new Date(),
    })

    const legacyResponse = await client.get(`/api/tasks/${task.id}/audit-logs`).loginAs(owner)
    legacyResponse.assertStatus(200)

    const canonicalResponse = await client.get(`/api/v1/tasks/${task.id}/audit-logs`).loginAs(owner)
    canonicalResponse.assertStatus(200)

    assert.deepEqual(canonicalResponse.body(), legacyResponse.body())
  })

  test('task audit cache stays authorization-scoped after an owner warms it', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const unrelatedMember = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: unrelatedMember.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      task_visibility: 'internal',
      title: 'Authorization-scoped audit cache task',
    })
    await db.table('audit_events').insert({
      user_id: owner.id,
      action: 'task_updated',
      entity_type: 'task',
      entity_id: task.id,
      old_values: JSON.stringify({ title: 'Sensitive old title' }),
      new_values: JSON.stringify({ title: task.title }),
      ip_address: '127.0.0.1',
      user_agent: 'contract-test',
      occurred_at: new Date(),
    })

    const ownerResponse = await client.get(`/api/tasks/${task.id}/audit-logs`).loginAs(owner)
    ownerResponse.assertStatus(200)
    const generationNamespaces = entityCacheGenerationNamespaces(
      CACHE_COLLECTION_GENERATION_NAMESPACES.taskAudit,
      'task',
      task.id
    )
    const ownerCacheKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      `task:audit:${task.id}:viewer:${owner.id}:limit:20`
    )
    assert.isNotNull(ownerCacheKey)
    assert.isNotNull(await RedisCacheStore.get(ownerCacheKey ?? 'generation-resolution-failed'))

    const unrelatedResponse = await client
      .get(`/api/tasks/${task.id}/audit-logs`)
      .loginAs(unrelatedMember)
    unrelatedResponse.assertStatus(403)
    const unrelatedCacheKey = await RedisCacheStore.resolveVersionedKeyBestEffort(
      generationNamespaces,
      `task:audit:${task.id}:viewer:${unrelatedMember.id}:limit:20`
    )
    assert.isNotNull(unrelatedCacheKey)
    assert.isNull(await RedisCacheStore.get(unrelatedCacheKey ?? 'generation-resolution-failed'))
  })

  test('task sort-order endpoint returns wrapped canonical task payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      title: 'Sortable task',
      sort_order: 2,
    })

    const response = await client.patch(`/api/tasks/${task.id}/sort-order`).loginAs(owner).json({
      sortOrder: 11,
      taskStatusId: task.task_status_id,
    })
    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        sort_order: number
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, task.id)
    assert.equal(body.data.sort_order, 11)
  })

  test('task status endpoint accepts camelCase taskStatusId and returns wrapped task payload', async ({
    assert,
    client,
  }) => {
    const scenario = await TaskStatusScenario.create()
    const owner = await User.findOrFail(scenario.ownerId)
    const task = await scenario.createTask({
      creator_id: scenario.ownerId,
      assigned_to: scenario.ownerId,
    })
    const inProgressStatusId = await scenario.statusId('in_progress')

    const response = await client
      .put(`/tasks/${task.id}/status`)
      .loginAs(owner)
      .header('accept', 'application/json')
      .json({
        taskStatusId: inProgressStatusId,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        task_status_id: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.id, task.id)
    assert.equal(body.data.task_status_id, inProgressStatusId)
  })

  test('marketplace apply endpoint returns wrapped created application payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const applicant = await UserFactory.createExternalContributor({
      current_organization_id: org.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'Marketplace apply contract task',
    })

    const response = await client
      .post(`/api/tasks/${task.id}/apply`)
      .loginAs(applicant)
      .json({
        message: 'I can take this task',
        portfolio_links: ['https://portfolio.example.com'],
        application_source: 'public_listing',
      })
    response.assertStatus(201)

    const body = response.body() as {
      data: {
        id: string
        taskId: string
        applicantId: string
        message: string | null
        portfolioLinks?: string[] | null
        applicationSource?: string | null
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.taskId, task.id)
    assert.equal(body.data.applicantId, applicant.id)
    assert.equal(body.data.message, 'I can take this task')
    assert.deepEqual(body.data.portfolioLinks, ['https://portfolio.example.com'])
    assert.equal(body.data.applicationSource, 'public_listing')
  })

  test('v1 marketplace apply endpoint preserves legacy wrapped created application payload', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const legacyApplicant = await UserFactory.createExternalContributor({
      current_organization_id: org.id,
    })
    const canonicalApplicant = await UserFactory.createExternalContributor({
      current_organization_id: org.id,
    })
    const legacyTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'Legacy marketplace apply parity task',
    })
    const canonicalTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      task_visibility: 'external',
      title: 'Canonical marketplace apply parity task',
    })

    const payload = {
      message: 'Parity apply payload',
      portfolio_links: ['https://portfolio.example.com/parity'],
      application_source: 'public_listing',
    }

    const legacyResponse = await client
      .post(`/api/tasks/${legacyTask.id}/apply`)
      .loginAs(legacyApplicant)
      .json(payload)
    legacyResponse.assertStatus(201)

    const canonicalResponse = await client
      .post(`/api/v1/tasks/${canonicalTask.id}/apply`)
      .loginAs(canonicalApplicant)
      .json(payload)
    canonicalResponse.assertStatus(201)

    const legacyBody = legacyResponse.body() as {
      data: {
        taskId: string
        applicantId: string
        message: string | null
        portfolioLinks?: string[] | null
        applicationSource?: string | null
      }
    }
    const canonicalBody = canonicalResponse.body() as typeof legacyBody

    assert.equal(legacyBody.data.taskId, legacyTask.id)
    assert.equal(canonicalBody.data.taskId, canonicalTask.id)
    assert.equal(legacyBody.data.message, canonicalBody.data.message)
    assert.deepEqual(legacyBody.data.portfolioLinks, canonicalBody.data.portfolioLinks)
    assert.equal(legacyBody.data.applicationSource, canonicalBody.data.applicationSource)
  })
})
