import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ProjectFactory,
  ProjectMemberFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Project sprint goal contract', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create and update APIs expose Sprint Goal', async ({ assert, client }) => {
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
      project_role: 'project_owner',
    })

    const createResponse = await client
      .post(`/api/v1/projects/${project.id}/sprints`)
      .loginAs(owner)
      .json({
        name: 'Sprint Goal Contract',
        goal: 'Ship the first usable sprint planning loop',
        startsAt: '2026-07-16T00:00:00.000Z',
        endsAt: '2026-07-30T00:00:00.000Z',
        status: 'active',
      })

    createResponse.assertStatus(201)
    const createdBody = createResponse.body() as {
      data: { id: string; goal: string | null }
    }
    assert.equal(createdBody.data.goal, 'Ship the first usable sprint planning loop')

    const updateResponse = await client
      .patch(`/api/v1/projects/${project.id}/sprints/${createdBody.data.id}`)
      .loginAs(owner)
      .json({
        goal: 'Reduce sprint planning ambiguity before review opens',
      })

    updateResponse.assertStatus(200)
    const updatedBody = updateResponse.body() as {
      data: { goal: string | null }
    }
    assert.equal(updatedBody.data.goal, 'Reduce sprint planning ambiguity before review opens')

    const boardResponse = await client
      .get(`/api/v1/projects/${project.id}/sprint-board`)
      .qs({ projectSprintId: createdBody.data.id })
      .loginAs(owner)

    boardResponse.assertStatus(200)
    const boardBody = boardResponse.body() as {
      data: { sprint: { goal: string | null } | null }
    }
    assert.equal(boardBody.data.sprint?.goal, 'Reduce sprint planning ambiguity before review opens')
  })

  test('blank Sprint Goal is normalized to null', async ({ assert, client }) => {
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
      project_role: 'project_owner',
    })

    const response = await client
      .post(`/api/v1/projects/${project.id}/sprints`)
      .loginAs(owner)
      .json({
        name: 'Blank Goal Sprint',
        goal: '   ',
        startsAt: '2026-07-16T00:00:00.000Z',
        endsAt: '2026-07-30T00:00:00.000Z',
        status: 'draft',
      })

    response.assertStatus(201)
    const body = response.body() as { data: { goal: string | null } }
    assert.isNull(body.data.goal)
  })
})
