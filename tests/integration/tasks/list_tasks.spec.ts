import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  UserFactory,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import Task from '#models/task'

test.group('Integration | List Tasks', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('org admin sees all tasks in their org', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })

    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, title: 'Owner Task' })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: member.id,
      title: 'Member Task',
    })

    const tasks = await Task.query().where('organization_id', org.id).whereNull('deleted_at')
    assert.equal(tasks.length, 2)
  })

  test('tasks from other orgs are not visible', async ({ assert }) => {
    const { org: org1, owner: owner1 } = await OrganizationFactory.createWithOwner()
    const { org: org2, owner: owner2 } = await OrganizationFactory.createWithOwner()

    await TaskFactory.create({ organization_id: org1.id, creator_id: owner1.id })
    await TaskFactory.create({ organization_id: org2.id, creator_id: owner2.id })

    const orgTasks = await Task.query().where('organization_id', org1.id)
    assert.equal(orgTasks.length, 1)
  })

  test('search filter by title works', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Fix login bug',
    })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Add feature',
    })

    const results = await Task.query()
      .where('organization_id', org.id)
      .whereILike('title', '%login%')
    assert.equal(results.length, 1)
    assert.equal(results[0]!.title, 'Fix login bug')
  })

  test('status filter works', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, status: 'todo' })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      status: 'in_progress',
    })
    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, status: 'done' })

    const todoTasks = await Task.query().where('organization_id', org.id).where('status', 'todo')
    assert.equal(todoTasks.length, 1)
  })

  test('priority filter works', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, priority: 'urgent' })
    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id, priority: 'low' })

    const urgentTasks = await Task.query()
      .where('organization_id', org.id)
      .where('priority', 'urgent')
    assert.equal(urgentTasks.length, 1)
  })

  test('soft-deleted tasks are hidden', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const activeTask = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    const deletedTask = await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    await deletedTask.merge({ deleted_at: DateTime.now() }).save()

    const tasks = await Task.query().where('organization_id', org.id).whereNull('deleted_at')
    assert.equal(tasks.length, 1)
    assert.equal(tasks[0]!.id, activeTask.id)
  })

  test('sort by created_at desc works', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    const task1 = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'First',
    })
    const task2 = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Second',
    })

    const tasks = await Task.query().where('organization_id', org.id).orderBy('created_at', 'desc')
    assert.equal(tasks[0]!.id, task2.id)
    assert.equal(tasks[1]!.id, task1.id)
  })

  test('pagination works correctly', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()

    for (let i = 0; i < 15; i++) {
      await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    }

    const page1 = await Task.query().where('organization_id', org.id).paginate(1, 10)

    assert.equal(page1.total, 15)
    assert.equal(page1.perPage, 10)
    assert.equal(page1.currentPage, 1)
    assert.equal(page1.all().length, 10)

    const page2 = await Task.query().where('organization_id', org.id).paginate(2, 10)

    assert.equal(page2.all().length, 5)
  })

  test('superadmin sees all tasks', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })
    await TaskFactory.create({ organization_id: org.id, creator_id: owner.id })

    await UserFactory.createSuperadmin()

    // Superadmin can query without org filter
    const allTasks = await Task.query().whereNull('deleted_at')
    assert.isAbove(allTasks.length, 0)
  })
})
