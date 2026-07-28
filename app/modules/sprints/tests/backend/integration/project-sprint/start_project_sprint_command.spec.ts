import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { sprintCommandFactory } from '#composition/sprints/sprint-application/sprint_application_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, ProjectFactory, ProjectMemberFactory, TaskFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | Start project sprint command', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('starts one draft Sprint and rejects a second active Sprint', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id, manager_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: owner.id, project_role: 'project_manager' })
    const [draft] = (await db.table('project_sprints').insert({
      id: crypto.randomUUID(), organization_id: org.id, project_id: project.id, name: 'Draft', status: 'draft',
      starts_at: '2026-08-10T00:00:00.000Z', ends_at: '2026-08-11T00:00:00.000Z', created_by: owner.id,
      created_at: new Date(), updated_at: new Date(),
    }).returning('*')) as { id: string; status: string }[]
    const [second] = (await db.table('project_sprints').insert({
      id: crypto.randomUUID(), organization_id: org.id, project_id: project.id, name: 'Second', status: 'draft',
      starts_at: '2026-08-12T00:00:00.000Z', ends_at: '2026-08-13T00:00:00.000Z', created_by: owner.id,
      created_at: new Date(), updated_at: new Date(),
    }).returning('*')) as { id: string; status: string }[]
    if (!draft || !second) throw new Error('Failed to create sprint fixtures')
    const plannedTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      project_sprint_id: draft.id,
    })
    const command = sprintCommandFactory.makeStart({ userId: owner.id, organizationId: org.id, ip: '127.0.0.1', userAgent: 'test' })
    const started = await command.execute({ project_id: project.id, sprint_id: draft.id })
    assert.equal(started.status, 'active')
    const history = (await db.from('project_sprint_task_assignments').where({ task_id: plannedTask.id })) as Array<{ sprint_id: string | null }>
    assert.lengthOf(history, 1)
    assert.equal(history[0]?.sprint_id, draft.id)
    await assert.rejects(() => command.execute({ project_id: project.id, sprint_id: second.id }), /already has an active sprint/)
    assert.equal(await db.from('project_sprints').where({ project_id: project.id, status: 'active' }).count('* as total').first().then((row) => Number((row as { total: string }).total)), 1)
  })
})
