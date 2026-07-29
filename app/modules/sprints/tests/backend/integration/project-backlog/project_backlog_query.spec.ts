import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, ProjectFactory, ProjectMemberFactory, TaskFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Project backlog query', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns only current non-deleted backlog tasks in deterministic order', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await owner.merge({ current_organization_id: org.id }).save()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: owner.id, project_role: 'project_manager' })
    const first = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id })
    const second = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id })
    const hidden = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id })
    const assigned = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id })
    await db.from('tasks').where('id', first.id).update({ sort_order: 10 })
    await db.from('tasks').where('id', second.id).update({ sort_order: 20 })
    await db.from('tasks').where('id', hidden.id).update({ sort_order: 1, deleted_at: new Date() })
    await db.from('tasks').where('id', assigned.id).update({ project_sprint_id: crypto.randomUUID() })

    const response = await client.get(`/api/v1/projects/${project.id}/backlog`).loginAs(owner)
    response.assertStatus(200)
    const body = response.body() as { data: { tasks: Array<{ id: string }>; counts: { total: number } } }
    assert.deepEqual(body.data.tasks.map((task) => task.id), [first.id, second.id])
    assert.equal(body.data.counts.total, 2)

    const reorder = await client
      .post(`/api/v1/projects/${project.id}/tasks/${second.id}/backlog-order`)
      .loginAs(owner)
      .json({ beforeTaskId: first.id })
    reorder.assertStatus(200)
    const refreshed = await client.get(`/api/v1/projects/${project.id}/backlog`).loginAs(owner)
    const refreshedBody = refreshed.body() as { data: { tasks: Array<{ id: string }> } }
    assert.deepEqual(refreshedBody.data.tasks.map((task) => task.id), [second.id, first.id])
  })

})
