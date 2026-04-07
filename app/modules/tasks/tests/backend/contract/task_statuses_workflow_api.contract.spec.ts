import { test } from '@japa/runner'

import TaskStatusModel from '#modules/tasks/infra/models/task_status'
import TaskWorkflowTransition from '#modules/tasks/infra/models/task_workflow_transition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface CanonicalTaskStatus {
  id: string
  organizationId: string
  name: string
  slug: string
  group: string
  color: string
  icon: string | null
  description: string | null
  sortOrder: number
  isDefault: boolean
  isSystem: boolean
  createdAt: string | null
  updatedAt: string | null
}

interface CanonicalWorkflowTransition {
  id: string
  organizationId: string
  fromStatusId: string
  toStatusId: string
  conditions: Record<string, unknown>
  createdAt: string | null
  fromStatus?: CanonicalTaskStatus
  toStatus?: CanonicalTaskStatus
}

async function seedTaskStatusAndWorkflowFixtures(organizationId: string) {
  const todo = await TaskStatusModel.create({
    id: testId(),
    organization_id: organizationId,
    name: 'Todo',
    slug: 'todo',
    category: 'todo',
    color: '#94A3B8',
    sort_order: 1,
    is_default: true,
    is_system: true,
  })
  const inProgress = await TaskStatusModel.create({
    id: testId(),
    organization_id: organizationId,
    name: 'In Progress',
    slug: 'in_progress',
    category: 'in_progress',
    color: '#3B82F6',
    sort_order: 2,
    is_default: false,
    is_system: true,
  })

  await TaskWorkflowTransition.create({
    id: testId(),
    organization_id: organizationId,
    from_status_id: todo.id,
    to_status_id: inProgress.id,
    conditions: {},
  })
}

test.group('Contract | Task statuses and workflow APIs', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('legacy and v1 task-status list endpoints share canonical response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(org.id)

    const legacyResponse = await client.get('/api/task-statuses').loginAs(owner)
    const v1Response = await client.get('/api/v1/task-statuses').loginAs(owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)

    const legacyBody = legacyResponse.body() as { data: CanonicalTaskStatus[] }
    const v1Body = v1Response.body() as { data: CanonicalTaskStatus[] }

    assert.isArray(legacyBody.data)
    assert.isArray(v1Body.data)
    assert.isAbove(legacyBody.data.length, 0)
    assert.isAbove(v1Body.data.length, 0)

    const legacyTodo = legacyBody.data[0]
    const v1Todo = v1Body.data[0]
    if (!legacyTodo || !v1Todo) {
      throw new Error('Expected canonical task statuses in legacy and v1 responses')
    }

    assert.properties(legacyTodo, [
      'id',
      'organizationId',
      'name',
      'slug',
      'group',
      'color',
      'icon',
      'description',
      'sortOrder',
      'isDefault',
      'isSystem',
      'createdAt',
      'updatedAt',
    ])
    assert.properties(v1Todo, [
      'id',
      'organizationId',
      'name',
      'slug',
      'group',
      'color',
      'icon',
      'description',
      'sortOrder',
      'isDefault',
      'isSystem',
      'createdAt',
      'updatedAt',
    ])
    assert.notProperty(legacyTodo, 'organization_id')
    assert.notProperty(legacyTodo, 'sort_order')
    assert.notProperty(v1Todo, 'organization_id')
    assert.notProperty(v1Todo, 'sort_order')
  })

  test('legacy and v1 workflow endpoints share canonical response shape', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(org.id)

    const legacyResponse = await client.get('/api/workflow').loginAs(owner)
    const v1Response = await client.get('/api/v1/workflow').loginAs(owner)

    legacyResponse.assertStatus(200)
    v1Response.assertStatus(200)

    const legacyBody = legacyResponse.body() as { data: CanonicalWorkflowTransition[] }
    const v1Body = v1Response.body() as { data: CanonicalWorkflowTransition[] }

    assert.isArray(legacyBody.data)
    assert.isArray(v1Body.data)
    assert.isAbove(legacyBody.data.length, 0)
    assert.isAbove(v1Body.data.length, 0)

    const legacyTransition = legacyBody.data[0]
    const v1Transition = v1Body.data[0]
    if (!legacyTransition || !v1Transition) {
      throw new Error('Expected canonical workflow transitions in legacy and v1 responses')
    }

    assert.properties(legacyTransition, [
      'id',
      'organizationId',
      'fromStatusId',
      'toStatusId',
      'conditions',
      'createdAt',
    ])
    assert.properties(v1Transition, [
      'id',
      'organizationId',
      'fromStatusId',
      'toStatusId',
      'conditions',
      'createdAt',
    ])
    assert.notProperty(legacyTransition, 'organization_id')
    assert.notProperty(legacyTransition, 'from_status_id')
    assert.notProperty(v1Transition, 'organization_id')
    assert.notProperty(v1Transition, 'from_status_id')
  })

  test('legacy and v1 task-status create endpoints accept canonical camelCase and return wrapped data', async ({
    assert,
    client,
  }) => {
    const { org: legacyOrg, owner: legacyOwner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(legacyOrg.id)
    const { org: v1Org, owner: v1Owner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(v1Org.id)

    const payload = {
      name: 'Ready For QA',
      group: 'in_progress',
      color: '#123456',
      sortOrder: 77,
      description: 'Canonical payload',
    }

    const legacyResponse = await client
      .post('/api/task-statuses')
      .json(payload)
      .loginAs(legacyOwner)
    const v1Response = await client.post('/api/v1/task-statuses').json(payload).loginAs(v1Owner)

    legacyResponse.assertStatus(201)
    v1Response.assertStatus(201)

    const legacyBody = legacyResponse.body() as { data: CanonicalTaskStatus }
    const v1Body = v1Response.body() as { data: CanonicalTaskStatus }

    assert.equal(legacyBody.data.name, payload.name)
    assert.equal(legacyBody.data.group, payload.group)
    assert.equal(legacyBody.data.color, payload.color)
    assert.equal(legacyBody.data.sortOrder, payload.sortOrder)
    assert.equal(v1Body.data.name, payload.name)
    assert.equal(v1Body.data.group, payload.group)
    assert.equal(v1Body.data.color, payload.color)
    assert.equal(v1Body.data.sortOrder, payload.sortOrder)
    assert.notProperty(legacyBody.data, 'sort_order')
    assert.notProperty(v1Body.data, 'sort_order')
  })

  test('legacy task-status PATCH alias preserves canonical update contract', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(org.id)

    const taskStatus = await TaskStatusModel.create({
      id: testId(),
      organization_id: org.id,
      name: 'Ready For Review',
      slug: 'ready_for_review',
      category: 'in_progress',
      color: '#64748B',
      sort_order: 3,
      is_default: false,
      is_system: false,
    })

    const payload = {
      name: 'Ready For Acceptance',
      color: '#0F766E',
      sortOrder: 19,
      description: 'PATCH alias on compat route',
    }

    const response = await client
      .patch(`/api/task-statuses/${taskStatus.id}`)
      .json(payload)
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as { data: CanonicalTaskStatus }

    assert.equal(body.data.id, taskStatus.id)
    assert.equal(body.data.name, payload.name)
    assert.equal(body.data.color, payload.color)
    assert.equal(body.data.sortOrder, payload.sortOrder)
    assert.equal(body.data.description, payload.description)
    assert.notProperty(body.data, 'sort_order')
    assert.notProperty(body.data, 'organization_id')
  })

  test('v1 task-status PATCH preserves canonical update contract', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await seedTaskStatusAndWorkflowFixtures(org.id)

    const taskStatus = await TaskStatusModel.create({
      id: testId(),
      organization_id: org.id,
      name: 'Ready For QA',
      slug: 'ready_for_qa',
      category: 'in_progress',
      color: '#64748B',
      sort_order: 3,
      is_default: false,
      is_system: false,
    })

    const payload = {
      name: 'QA Review',
      slug: 'qa_review',
      sortOrder: 1,
    }

    const response = await client
      .patch(`/api/v1/task-statuses/${taskStatus.id}`)
      .json(payload)
      .loginAs(owner)

    response.assertStatus(200)

    const body = response.body() as { data: CanonicalTaskStatus }

    assert.equal(body.data.id, taskStatus.id)
    assert.equal(body.data.name, payload.name)
    assert.equal(body.data.slug, payload.slug)
    assert.equal(body.data.sortOrder, payload.sortOrder)
    assert.notProperty(body.data, 'sort_order')
    assert.notProperty(body.data, 'organization_id')
  })
})
