import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { omitUndefined } from '#modules/contracts/public_contracts/optional_payload'
import GetTasksListDTO from '#modules/tasks/actions/dtos/request/get_tasks_list_dto'
import { makeSystemTaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { makeGetTasksListQuery } from '#modules/tasks/bootstrap/task_query_factory'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  OrganizationUserFactory,
  SkillFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

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

    const adminQuery = makeGetTasksListQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps)
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
      new GetTasksListDTO(omitUndefined({
        organization_id: org.id,
        search: 'login',
        task_status_id: secondLoginTask.task_status_id ? [secondLoginTask.task_status_id] : undefined,
      }))
    )

    assert.equal(page.meta.total, 3)
    assert.equal(page.data[0]?.id, docsTask.id)
    assert.equal(page.stats?.total, 3)
    assert.equal(page.stats?.by_status['todo'], 1)
    assert.equal(page.stats?.by_status['in_progress'], 1)
    assert.equal(page.stats?.by_status['done'], 1)
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

    const result = await makeGetTasksListQuery(makeSystemTaskActionContext(member.id), taskExternalDeps).execute(
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

    const result = await makeGetTasksListQuery(
      makeSystemTaskActionContext(pendingUser.id),
      taskExternalDeps
    ).execute(
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

  test('task list filters project backlog and active sprint tasks separately', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await db
      .table('projects')
      .insert({
        id: crypto.randomUUID(),
        creator_id: owner.id,
        owner_id: owner.id,
        name: 'Sprint Project',
        organization_id: org.id,
        status: 'in_progress',
        visibility: 'team',
        allow_external_contributors: false,
        approval_required_for_members: false,
        created_at: DateTime.utc().toSQL(),
        updated_at: DateTime.utc().toSQL(),
      })
      .returning(['id'])
    const projectRows = project as { id: string }[]
    const projectRow = projectRows[0]
    if (!projectRow) {
      throw new Error('Failed to create project fixture')
    }
    const projectId = projectRow.id
    const sprintId = crypto.randomUUID()

    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: projectId,
      name: 'Sprint 1',
      status: 'active',
      starts_at: DateTime.utc().minus({ days: 1 }).toSQL(),
      ends_at: DateTime.utc().plus({ days: 13 }).toSQL(),
      created_by: owner.id,
      created_at: DateTime.utc().toSQL(),
      updated_at: DateTime.utc().toSQL(),
    })

    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: projectId,
      creator_id: owner.id,
      title: 'Sprint scoped task',
      project_sprint_id: sprintId,
    })
    const backlogTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: projectId,
      creator_id: owner.id,
      title: 'Backlog task',
      project_sprint_id: null,
    })

    const query = makeGetTasksListQuery(makeSystemTaskActionContext(owner.id), taskExternalDeps)
    const sprintResult = await query.execute(
      new GetTasksListDTO({
        organization_id: org.id,
        project_id: projectId,
        project_sprint_id: sprintId,
        page: 1,
        limit: 20,
      })
    )
    const backlogResult = await query.execute(
      new GetTasksListDTO({
        organization_id: org.id,
        project_id: projectId,
        project_sprint_id: null,
        page: 1,
        limit: 20,
      })
    )

    assert.deepEqual(
      sprintResult.data.map((task) => task.id),
      [sprintTask.id]
    )
    assert.deepEqual(
      backlogResult.data.map((task) => task.id),
      [backlogTask.id]
    )
  })

  test('org task list search uses indexed required skill keywords', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const matchingTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Backend migration',
      description: 'Move services carefully',
    })
    await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Frontend polish',
      description: 'No engine term here',
    })
    const skill = await SkillFactory.create({ skill_name: 'Elasticsearch' })

    await db.table('task_required_skills').insert({
      id: crypto.randomUUID(),
      task_id: matchingTask.id,
      skill_id: skill.id,
      required_public_proficiency_code: 'l4',
      is_mandatory: true,
    })

    const [{ TaskSearchDocumentBuilder }, { TaskSearchIndexRepository }, { searchClient }] =
      await Promise.all([
        import('#modules/search/infra/tasks/task_search_document_builder'),
        import('#modules/search/infra/tasks/task_search_index_repository'),
        import('#modules/search/infra/search_client'),
      ])

    const repository = new TaskSearchIndexRepository()
    const builder = new TaskSearchDocumentBuilder()

    await repository.resetIndex()
    await repository.ensureIndex()
    await repository.upsertDocument(await builder.build(matchingTask.id))
    await searchClient.indices.refresh({ index: repository.indexName })

    const result = await makeGetTasksListQuery(
      makeSystemTaskActionContext(owner.id),
      taskExternalDeps
    ).execute(
      new GetTasksListDTO({
        organization_id: org.id,
        search: 'elastic',
        page: 1,
        limit: 20,
      })
    )

    assert.deepEqual(
      result.data.map((task) => task.id),
      [matchingTask.id]
    )
  }).timeout(10000)
})
