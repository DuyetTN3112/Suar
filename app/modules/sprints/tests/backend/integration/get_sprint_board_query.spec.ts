import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import GetSprintBoardQuery from '#modules/sprints/actions/queries/get_sprint_board_query'
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
  name?: string
}) {
  const rows = (await db
    .table('project_sprints')
    .insert({
      id: crypto.randomUUID(),
      organization_id: input.organizationId,
      project_id: input.projectId,
      name: input.name ?? 'Sprint Board',
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

test.group('Integration | Sprint board query', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns selected sprint tasks separately from backlog tasks', async ({ assert }) => {
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
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })
    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Sprint task',
      project_sprint_id: sprintId,
    })
    const backlogTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Backlog task',
      project_sprint_id: null,
    })
    const otherProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
      manager_id: owner.id,
    })
    const foreignProjectTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: otherProject.id,
      creator_id: owner.id,
      title: 'Foreign project backlog task',
      project_sprint_id: null,
    })

    const result = await new GetSprintBoardQuery(makeSprintContext(owner.id, org.id)).handle({
      project_id: project.id,
      project_sprint_id: sprintId,
    })

    assert.equal(result.project_id, project.id)
    assert.equal(result.sprint?.id, sprintId)
    assert.deepEqual(result.sprint_tasks.map((task) => task.id), [sprintTask.id])
    assert.deepEqual(result.backlog_tasks.map((task) => task.id), [backlogTask.id])
    assert.notInclude(result.backlog_tasks.map((task) => task.id), foreignProjectTask.id)
    assert.equal(result.counts.sprint_tasks, 1)
    assert.equal(result.counts.backlog_tasks, 1)
  })

  test('canonical API returns sprint board data', async ({ assert, client }) => {
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
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })
    await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'API sprint task',
      project_sprint_id: sprintId,
    })

    const response = await client
      .get(`/api/v1/projects/${project.id}/sprint-board`)
      .qs({ projectSprintId: sprintId })
      .loginAs(owner)

    response.assertStatus(200)
    const body = response.body() as {
      data: { projectId: string; sprint: { id: string } | null; counts: { sprintTasks: number } }
    }
    assert.equal(body.data.projectId, project.id)
    assert.equal(body.data.sprint?.id, sprintId)
    assert.equal(body.data.counts.sprintTasks, 1)
  })

  test('regular project member can inspect sprint board without management permission', async ({
    assert,
  }) => {
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
    const sprintId = await createSprint({
      organizationId: org.id,
      projectId: project.id,
      actorId: owner.id,
    })
    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Visible sprint task',
      project_sprint_id: sprintId,
    })

    const result = await new GetSprintBoardQuery(makeSprintContext(member.id, org.id)).handle({
      project_id: project.id,
      project_sprint_id: sprintId,
    })

    assert.deepEqual(result.sprint_tasks.map((task) => task.id), [sprintTask.id])
  })
})
