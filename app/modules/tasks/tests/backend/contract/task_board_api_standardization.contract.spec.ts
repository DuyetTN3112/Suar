import { test } from '@japa/runner'

import Task from '#modules/tasks/infra/models/task'
import TaskStatusModel from '#modules/tasks/infra/models/task_status'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory, TaskFactory } from '#tests/helpers/factories'

test.group('Contract | Task board API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('grouped tasks endpoint returns wrapped data without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Grouped contract task',
    })

    const response = await client.get('/api/tasks/grouped').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: Record<string, { id: string }[]>
    }

    assert.notProperty(body, 'success')
    assert.property(body, 'data')
    const taskIds = Object.values(body.data).flatMap((tasks) => tasks.map((task) => task.id))
    assert.isAbove(taskIds.length, 0)
  })

  test('timeline tasks endpoint returns wrapped data array without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Timeline contract task',
    })

    const response = await client.get('/api/tasks/timeline').loginAs(owner)
    response.assertStatus(200)

    const body = response.body() as {
      data: { id: string }[]
    }

    assert.notProperty(body, 'success')
    assert.isArray(body.data)
    assert.include(
      body.data.map((entry) => entry.id),
      task.id
    )
  })

  test('batch status endpoint returns wrapped result payload without success envelope', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const taskA = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Batch contract task A',
    })
    const taskB = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Batch contract task B',
    })

    const inProgressStatus = await TaskStatusModel.query()
      .where('organization_id', org.id)
      .where('slug', 'in_progress')
      .firstOrFail()

    const response = await client
      .patch('/api/tasks/batch-status')
      .loginAs(owner)
      .json({
        taskIds: [taskA.id, taskB.id],
        taskStatusId: inProgressStatus.id,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        updated: number
        failed: string[]
      }
    }

    assert.notProperty(body, 'success')
    assert.equal(body.data.updated, 2)
    assert.deepEqual(body.data.failed, [])

    const refreshedTaskA = await Task.findOrFail(taskA.id)
    const refreshedTaskB = await Task.findOrFail(taskB.id)
    assert.equal(refreshedTaskA.task_status_id, inProgressStatus.id)
    assert.equal(refreshedTaskB.task_status_id, inProgressStatus.id)
  })

  test('batch status endpoint still accepts legacy snake_case aliases during transition', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: owner.id,
      status: 'todo',
      title: 'Batch legacy alias task',
    })

    const inProgressStatus = await TaskStatusModel.query()
      .where('organization_id', org.id)
      .where('slug', 'in_progress')
      .firstOrFail()

    const response = await client
      .patch('/api/tasks/batch-status')
      .loginAs(owner)
      .json({
        task_ids: [task.id],
        task_status_id: inProgressStatus.id,
      })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        updated: number
      }
    }

    assert.equal(body.data.updated, 1)
  })

  test('status board patch endpoint accepts camelCase request fields and returns wrapped data', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.patch('/api/tasks/status-board').loginAs(owner).json({
      total: 7,
      simulateConflict: false,
    })

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        acknowledgedTotal: number | null
      }
    }

    assert.notProperty(body, 'success')
    assert.deepEqual(body, {
      data: {
        acknowledgedTotal: 7,
      },
    })
  })

  test('status board patch endpoint returns conflict for simulated concurrent board changes', async ({
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client.patch('/api/tasks/status-board').loginAs(owner).json({
      total: 7,
      simulateConflict: true,
    })

    response.assertStatus(409)
  })
})
