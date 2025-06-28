import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'
import GetTasksListQuery from '#actions/tasks/queries/get_tasks_list_query'
import GetTasksListDTO from '#actions/tasks/dtos/request/get_tasks_list_dto'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | List Tasks', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('approved org admins get filtered, paginated task lists scoped to their organization', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const { org: otherOrg, owner: otherOwner } = await OrganizationFactory.createWithOwner()

    const firstLoginTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Fix login bug',
      status: 'todo',
      priority: 'high',
    })
    const secondLoginTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Fix login UI',
      status: 'in_progress',
      priority: 'urgent',
    })
    const docsTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Write docs',
      status: 'done',
      priority: 'low',
    })
    const deletedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Deleted login follow-up',
    })
    await deletedTask.merge({ deleted_at: DateTime.now() }).save()
    await TaskFactory.create({
      organization_id: otherOrg.id,
      creator_id: otherOwner.id,
      title: 'Other org login issue',
    })

    const adminQuery = new GetTasksListQuery(ExecutionContext.system(owner.id))
    const page = await adminQuery.execute(
      new GetTasksListDTO({
        organization_id: org.id,
        page: 1,
        limit: 1,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
    )
    const filtered = await adminQuery.execute(
      new GetTasksListDTO({
        organization_id: org.id,
        search: 'login',
        task_status_id: secondLoginTask.task_status_id ?? undefined,
      })
    )

    assert.equal(page.meta.total, 3)
    assert.equal(page.data[0]?.id, docsTask.id)
    assert.equal(page.stats?.total, 3)
    assert.equal(page.stats?.by_status.todo, 1)
    assert.equal(page.stats?.by_status.in_progress, 1)
    assert.equal(page.stats?.by_status.done, 1)
    assert.equal(filtered.meta.total, 1)
    assert.equal(filtered.data[0]?.id, secondLoginTask.id)
    assert.notEqual(filtered.data[0]?.id, firstLoginTask.id)
  })

  test('approved members only see tasks they created or are assigned to', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    const coworker = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: coworker.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const assignedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: member.id,
      title: 'Assigned to member',
    })
    const ownTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: member.id,
      title: 'Created by member',
    })
    const hiddenTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      assigned_to: coworker.id,
      title: 'Assigned elsewhere',
    })
    const unassignedOwnerTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Owner backlog',
    })

    const result = await new GetTasksListQuery(ExecutionContext.system(member.id)).execute(
      new GetTasksListDTO({
        organization_id: org.id,
        page: 1,
        limit: 20,
      })
    )
    const visibleIds = result.data.map((task) => task.id)

    assert.include(visibleIds, assignedTask.id)
    assert.include(visibleIds, ownTask.id)
    assert.notInclude(visibleIds, hiddenTask.id)
    assert.notInclude(visibleIds, unassignedOwnerTask.id)
  })

  test('pending members do not receive task visibility until membership is approved', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const pendingUser = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: pendingUser.id,
      org_role: 'org_member',
      status: 'pending',
    })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Visible only after approval',
    })

    const result = await new GetTasksListQuery(ExecutionContext.system(pendingUser.id)).execute(
      new GetTasksListDTO({
        organization_id: org.id,
        page: 1,
        limit: 20,
      })
    )

    assert.lengthOf(result.data, 0)
    assert.equal(result.meta.total, 0)
    assert.equal(result.stats?.total, 0)
  })
})
