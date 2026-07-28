import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { sprintCommandFactory } from '#composition/sprints/sprint-application/sprint_application_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, ProjectFactory, ProjectMemberFactory, TaskFactory, cleanupTestData } from '#tests/helpers/factories'

const context = (userId: string, organizationId: string) => ({
  userId,
  organizationId,
  ip: '127.0.0.1',
  userAgent: 'test',
})

test.group('Integration | Project sprint task assignment history', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('keeps backlog, Sprint 1, and Sprint 2 assignments as append-only facts', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await owner.merge({ current_organization_id: org.id }).save()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_manager',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      project_sprint_id: null,
    })
    const sprintIds = []
    for (const name of ['Sprint 1', 'Sprint 2']) {
      const [sprint] = (await db.table('project_sprints').insert({
        id: crypto.randomUUID(),
        organization_id: org.id,
        project_id: project.id,
        name,
        status: 'active',
        starts_at: '2026-08-01T00:00:00.000Z',
        ends_at: '2026-08-14T00:00:00.000Z',
        created_by: owner.id,
        created_at: '2026-08-01T00:00:00.000Z',
        updated_at: '2026-08-01T00:00:00.000Z',
      }).returning(['id'])) as { id: string }[]
      if (!sprint) throw new Error('Failed to create sprint fixture')
      sprintIds.push(sprint.id)
    }

    const command = sprintCommandFactory.makeMoveTask(context(owner.id, org.id))
    const firstSprintId = sprintIds[0]
    const secondSprintId = sprintIds[1]
    if (!firstSprintId || !secondSprintId) throw new Error('Failed to create sprint fixtures')
    await command.execute({ project_id: project.id, task_id: task.id, project_sprint_id: firstSprintId })
    await command.execute({ project_id: project.id, task_id: task.id, project_sprint_id: secondSprintId })

    const history = (await db
      .from('project_sprint_task_assignments')
      .where({ project_id: project.id, task_id: task.id })
      .orderBy('entered_at', 'asc')
      .orderBy('id', 'asc')) as Array<{ sprint_id: string | null; exited_at: string | null }>

    assert.lengthOf(history, 3)
    const [backlogEntry, firstSprintEntry, secondSprintEntry] = history
    if (!backlogEntry || !firstSprintEntry || !secondSprintEntry) throw new Error('History rows missing')
    assert.isNull(backlogEntry.sprint_id)
    assert.equal(firstSprintEntry.sprint_id, firstSprintId)
    assert.equal(secondSprintEntry.sprint_id, secondSprintId)
    assert.isNotNull(backlogEntry.exited_at)
    assert.isNull(secondSprintEntry.exited_at)

    const response = await client
      .get(`/api/v1/projects/${project.id}/tasks/${task.id}/sprint-history`)
      .loginAs(owner)
    response.assertStatus(200)
    const body = response.body() as { data: Array<{ sprintId: string | null; current: boolean }> }
    assert.lengthOf(body.data, 3)
    assert.isTrue(body.data[2]?.current)
    assert.equal(body.data[2]?.sprintId, secondSprintId)
  })

  test('exposes the initial backlog location before the task is moved', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    await owner.merge({ current_organization_id: org.id }).save()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      project_sprint_id: null,
    })

    const response = await client
      .get(`/api/v1/projects/${project.id}/tasks/${task.id}/sprint-history`)
      .loginAs(owner)

    response.assertStatus(200)
    const body = response.body() as { data: Array<{ sprintId: string | null; entryReason: string; current: boolean }> }
    assert.lengthOf(body.data, 1)
    assert.isNull(body.data[0]?.sprintId)
    assert.equal(body.data[0]?.entryReason, 'created_in_backlog')
    assert.isTrue(body.data[0]?.current)
  })
})
