import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

interface TaskAuthoringApiSummary {
  mode: 'operational_only' | 'evidence_enabled'
  intent: 'save_draft' | 'publish'
  specificationVersionId: string
  contractVersionId: string | null
  headRevision: number
  idempotencyKey: string
  requestHash: string
  readiness: {
    policyVersion: string
    workState: string
    evidenceState: string
    assignmentReady: boolean
    evidenceReady: boolean
    blockers: Array<{ code: string }>
    warnings: Array<{ code: string }>
    assessedAt: string
  }
}

interface TaskAuthoringApiBody {
  data: {
    id: string
    authoring: TaskAuthoringApiSummary
  }
}

test.group('Contract | Task authoring mutation API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('@tva AR-002 AR-018 AR-019 mutations expose stable replay and conflict contracts', async ({
    assert,
    client,
  }) => {
    const scenario = await CreateTaskScenario.build()
    const owner = await User.findOrFail(scenario.ownerId)
    const createKey = `http-task-draft:${crypto.randomUUID()}`
    const createPayload = {
      title: 'HTTP pre-order API Draft',
      description: '',
      taskStatusId: scenario.todoStatusId,
      projectId: scenario.project.id,
      requiredSkills: [],
      acceptanceCriteria: '',
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotencyKey: createKey,
        expectedHeadRevision: 0,
        creatorConfirmed: false,
        specification: {
          plainText: 'Initial HTTP authoring contract.',
        },
      },
    }

    const createdResponse = await client
      .post('/tasks')
      .loginAs(owner)
      .header('Accept', 'application/json')
      .json(createPayload)
    createdResponse.assertStatus(201)
    const createdBody = createdResponse.body() as TaskAuthoringApiBody
    assert.equal(createdBody.data.authoring.headRevision, 1)
    assert.equal(createdBody.data.authoring.idempotencyKey, createKey)
    assert.equal(createdBody.data.authoring.contractVersionId, null)
    assert.isFalse(createdBody.data.authoring.readiness.assignmentReady)

    const createReplayResponse = await client
      .post('/tasks')
      .loginAs(owner)
      .header('Accept', 'application/json')
      .json(createPayload)
    createReplayResponse.assertStatus(201)
    const createReplayBody = createReplayResponse.body() as TaskAuthoringApiBody
    assert.equal(createReplayBody.data.id, createdBody.data.id)
    assert.deepEqual(createReplayBody.data.authoring, createdBody.data.authoring)

    const updateKey = `http-task-version:${crypto.randomUUID()}`
    const updatePayload = {
      authoring: {
        mode: 'evidence_enabled',
        intent: 'save_draft',
        idempotencyKey: updateKey,
        expectedHeadRevision: 1,
        creatorConfirmed: false,
        specification: {
          plainText: 'Clarified HTTP retry and compatibility contract.',
        },
      },
    }
    const updatedResponse = await client
      .put(`/tasks/${createdBody.data.id}`)
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .json(updatePayload)
    updatedResponse.assertStatus(200)
    const updatedBody = updatedResponse.body() as TaskAuthoringApiBody
    assert.equal(updatedBody.data.authoring.headRevision, 2)
    assert.equal(updatedBody.data.authoring.idempotencyKey, updateKey)

    const updateReplayResponse = await client
      .put(`/tasks/${createdBody.data.id}`)
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .json(updatePayload)
    updateReplayResponse.assertStatus(200)
    const updateReplayBody = updateReplayResponse.body() as TaskAuthoringApiBody
    assert.equal(updateReplayBody.data.id, createdBody.data.id)
    assert.deepEqual(updateReplayBody.data.authoring, updatedBody.data.authoring)

    const staleKey = `http-task-stale:${crypto.randomUUID()}`
    const staleResponse = await client
      .put(`/tasks/${createdBody.data.id}`)
      .loginAs(owner)
      .header('X-Inertia', 'true')
      .json({
        authoring: {
          ...updatePayload.authoring,
          idempotencyKey: staleKey,
          specification: { plainText: 'A stale editor must not create version 3.' },
        },
      })
    staleResponse.assertStatus(409)
    assert.lengthOf(
      await db
        .from('task_specification_versions')
        .where('task_id', createdBody.data.id),
      2
    )
    assert.isNull(
      await db
        .from('task_authoring_idempotency_keys')
        .where('idempotency_key', staleKey)
        .first()
    )
  }).timeout(10_000)
})
