import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { sprintCommandFactory } from '#composition/sprints/sprint-application/sprint_application_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { OrganizationFactory, ProjectFactory, ProjectMemberFactory, TaskFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Integration | End project sprint delivery command', (group) => {
  group.setup(async () => { await setupApp() })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('keeps terminal tasks historical and moves incomplete tasks to explicit destinations', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id, creator_id: owner.id, owner_id: owner.id, manager_id: owner.id })
    await ProjectMemberFactory.create({ project_id: project.id, user_id: owner.id, project_role: 'project_manager' })
    const sprintId = crypto.randomUUID()
    const nextSprintId = crypto.randomUUID()
    await db.table('project_sprints').insert([
      { id: sprintId, organization_id: org.id, project_id: project.id, name: 'Current', status: 'active', starts_at: '2026-08-01T00:00:00.000Z', ends_at: '2026-08-14T00:00:00.000Z', created_by: owner.id, created_at: new Date(), updated_at: new Date() },
      { id: nextSprintId, organization_id: org.id, project_id: project.id, name: 'Next', status: 'draft', starts_at: '2026-08-15T00:00:00.000Z', ends_at: '2026-08-28T00:00:00.000Z', created_by: owner.id, created_at: new Date(), updated_at: new Date() },
    ])
    const done = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id, project_sprint_id: sprintId, status: 'done' })
    const incompleteA = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id, project_sprint_id: sprintId, status: 'in_progress' })
    const incompleteB = await TaskFactory.create({ organization_id: org.id, project_id: project.id, creator_id: owner.id, project_sprint_id: sprintId, status: 'todo' })
    const result = await sprintCommandFactory.makeEndDelivery({ userId: owner.id, organizationId: org.id, ip: '127.0.0.1', userAgent: 'test' }).execute({
      project_id: project.id,
      sprint_id: sprintId,
      incomplete_tasks: [
        { task_id: incompleteA.id, destination: { kind: 'sprint', sprint_id: nextSprintId } },
        { task_id: incompleteB.id, destination: { kind: 'backlog' } },
      ],
    })
    assert.equal(result.sprint.status, 'active')
    assert.deepEqual(result.historical_task_ids, [done.id])
    assert.deepEqual(result.moved_to_sprint_ids, [incompleteA.id])
    assert.deepEqual(result.moved_to_backlog_ids, [incompleteB.id])
    const doneRow = (await db.from('tasks').where('id', done.id).select('project_sprint_id').first()) as { project_sprint_id: string | null }
    const incompleteARow = (await db.from('tasks').where('id', incompleteA.id).select('project_sprint_id').first()) as { project_sprint_id: string | null }
    const incompleteBRow = (await db.from('tasks').where('id', incompleteB.id).select('project_sprint_id').first()) as { project_sprint_id: string | null }
    assert.equal(doneRow.project_sprint_id, sprintId)
    assert.equal(incompleteARow.project_sprint_id, nextSprintId)
    assert.isNull(incompleteBRow.project_sprint_id)
  })
})
