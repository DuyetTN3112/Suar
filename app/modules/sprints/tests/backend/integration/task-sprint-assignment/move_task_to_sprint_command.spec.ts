import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { sprintCommandFactory } from '#composition/sprints/sprint-application/sprint_application_composition'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

function makeSprintContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

async function createSprint(input: {
  organizationId: string
  projectId: string
  actorId: string
  status?: string
}) {
  const rows = (await db
    .table('project_sprints')
    .insert({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      project_id: input.projectId,
      name: 'Sprint Core',
      status: input.status ?? 'active',
      starts_at: DateTime.utc().minus({ days: 1 }).toSQL(),
      ends_at: DateTime.utc().plus({ days: 13 }).toSQL(),
      created_by: input.actorId,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })
    .returning(['id'])) as { id: string }[]
  const row = rows[0]
  if (!row) {
    throw new Error('Failed to create sprint fixture')
  }

  return row.id
}

test.group('Integration | Move task to sprint command', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('project manager moves a task into sprint and back to backlog', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
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
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })

    const command = sprintCommandFactory.makeMoveTask(makeSprintContext(owner.id, org.id))
    const moved = await command.execute({
      project_id: project.id,
      task_id: task.id,
      project_sprint_id: sprintId,
    })
    const cleared = await command.execute({
      project_id: project.id,
      task_id: task.id,
      project_sprint_id: null,
    })

    assert.equal(moved.project_sprint_id, sprintId)
    assert.isNull(cleared.project_sprint_id)
    const history = await db
      .from('project_sprint_task_assignments')
      .where({ project_id: project.id, task_id: task.id })
      .orderBy('entered_at', 'asc')
    const typedHistory = history as Array<{ entry_reason: string; exit_reason: string | null }>
    assert.equal(typedHistory[1]?.entry_reason, 'scope_change')
    assert.equal(typedHistory[1]?.exit_reason, 'moved_to_backlog')
  })

  test('rejects sprint from another project', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    const otherProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: otherProject.id,
      actorId: owner.id,
    })

    await assert.rejects(
      () =>
        sprintCommandFactory.makeMoveTask(makeSprintContext(owner.id, org.id)).execute({
          project_id: project.id,
          task_id: task.id,
          project_sprint_id: sprintId,
        }),
      /same project/
    )
  })

  test('regular project member cannot move task into sprint backlog', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: member.id,
      project_role: 'project_member',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })

    await assert.rejects(
      () =>
        sprintCommandFactory.makeMoveTask(makeSprintContext(member.id, org.id)).execute({
          project_id: project.id,
          task_id: task.id,
          project_sprint_id: sprintId,
        }),
      /Actor cannot manage project sprint/
    )
  })

  test('canonical API moves a task into sprint', async ({ assert, client }) => {
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
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })

    const response = await client
      .patch(`/api/v1/projects/${project.id}/tasks/${task.id}/sprint`)
      .loginAs(owner)
      .json({ projectSprintId: sprintId })

    response.assertStatus(200)
    const body = response.body() as { data: { id: string; projectSprintId: string | null } }
    assert.equal(body.data.id, task.id)
    assert.equal(body.data.projectSprintId, sprintId)
  })
})
